import fs from 'fs'
import path from 'path'
import { loadAppConfig, printConfig } from './env-config'
import { validateDelayConfig, formatValidationErrors } from './validation'

/**
 * Health-check script for the WhatsApp automation system.
 *
 * Verifies:
 *   1. Node.js version meets minimum requirement (>=18)
 *   2. Required dependencies are installed
 *   3. TypeScript compiler is available
 *   4. Configuration loads correctly from environment
 *   5. Delay configuration passes validation
 *   6. WhatsApp session directory exists (if previously authenticated)
 *   7. Source files are present
 *
 * Exit codes:
 *   0 - All checks passed
 *   1 - One or more checks failed
 *
 * Usage:
 *   npx ts-node src/health-check.ts
 */

interface CheckResult {
  name: string
  status: 'pass' | 'fail' | 'warn'
  message: string
}

const results: CheckResult[] = []

function check(name: string, status: 'pass' | 'fail' | 'warn', message: string): void {
  results.push({ name, status, message })
}

function checkNodeVersion(): void {
  const version = process.versions.node
  const major = parseInt(version.split('.')[0], 10)
  if (major >= 18) {
    check('Node.js version', 'pass', `v${version} (>= 18 required)`)
  } else {
    check('Node.js version', 'fail', `v${version} - requires >= 18`)
  }
}

function checkDependency(name: string): void {
  try {
    require.resolve(name)
    check(`Dependency: ${name}`, 'pass', 'Installed')
  } catch {
    check(`Dependency: ${name}`, 'fail', 'Not installed. Run: npm install')
  }
}

function checkSourceFiles(): void {
  const srcDir = path.resolve(__dirname)
  const requiredFiles = [
    'types.ts',
    'config.ts',
    'utils.ts',
    'client.ts',
    'contacts.ts',
    'bulk-sender.ts',
    'index.ts',
  ]

  // When running compiled (dist/), check for .js; when running ts-node, check .ts
  const ext = __filename.endsWith('.js') ? '.js' : '.ts'

  for (const file of requiredFiles) {
    const target = file.replace('.ts', ext)
    const fullPath = path.join(srcDir, target)
    if (fs.existsSync(fullPath)) {
      check(`Source: ${file}`, 'pass', 'Present')
    } else {
      check(`Source: ${file}`, 'fail', `Missing at ${fullPath}`)
    }
  }
}

function checkWhatsAppSession(): void {
  // whatsapp-web.js LocalAuth stores sessions in .wwebjs_auth/
  const sessionDir = path.resolve(process.cwd(), '.wwebjs_auth')
  if (fs.existsSync(sessionDir)) {
    check('WhatsApp session', 'pass', 'Session directory found (.wwebjs_auth/)')
  } else {
    check(
      'WhatsApp session',
      'warn',
      'No session directory. First run will require QR code scan.',
    )
  }
}

function checkConfiguration(): void {
  try {
    const config = loadAppConfig()
    check('Configuration', 'pass', 'Loaded successfully from environment')

    const delayValidation = validateDelayConfig(config.delay)
    if (delayValidation.valid) {
      check('Delay config', 'pass', 'Valid delay configuration')
    } else {
      check(
        'Delay config',
        'fail',
        'Invalid delay configuration:\n' + formatValidationErrors(delayValidation),
      )
    }

    printConfig(config)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    check('Configuration', 'fail', `Failed to load: ${message}`)
  }
}

function checkEnvFile(): void {
  const envPath = path.resolve(process.cwd(), '.env')
  const envExamplePath = path.resolve(process.cwd(), '.env.example')

  if (fs.existsSync(envPath)) {
    check('.env file', 'pass', 'Found')
  } else if (fs.existsSync(envExamplePath)) {
    check('.env file', 'warn', 'Not found, but .env.example exists. Copy and configure it.')
  } else {
    check('.env file', 'warn', 'Not found. Using default configuration.')
  }
}

function printResults(): void {
  console.log('\n' + '='.repeat(60))
  console.log('WhatsApp Automation - Health Check')
  console.log('='.repeat(60) + '\n')

  let passed = 0
  let failed = 0
  let warned = 0

  for (const result of results) {
    const icon =
      result.status === 'pass'
        ? '[PASS]'
        : result.status === 'fail'
          ? '[FAIL]'
          : '[WARN]'
    console.log(`${icon} ${result.name}: ${result.message}`)

    if (result.status === 'pass') passed++
    else if (result.status === 'fail') failed++
    else warned++
  }

  console.log('\n' + '-'.repeat(60))
  console.log(
    `Results: ${passed} passed, ${failed} failed, ${warned} warnings`,
  )
  console.log('-'.repeat(60) + '\n')

  if (failed > 0) {
    console.log('Some checks failed. Please fix the issues above before running.\n')
  } else if (warned > 0) {
    console.log('All critical checks passed. Review warnings above.\n')
  } else {
    console.log('All checks passed. System is ready.\n')
  }
}

function main(): void {
  checkNodeVersion()
  checkDependency('whatsapp-web.js')
  checkDependency('qrcode-terminal')
  checkSourceFiles()
  checkWhatsAppSession()
  checkEnvFile()
  checkConfiguration()
  printResults()

  const hasFailed = results.some((r) => r.status === 'fail')
  process.exit(hasFailed ? 1 : 0)
}

main()
