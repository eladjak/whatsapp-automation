import type { DelayConfig, PuppeteerConfig } from './types'
import { DEFAULT_DELAY_CONFIG, DEFAULT_PUPPETEER_CONFIG } from './config'

/**
 * Environment-based configuration loader.
 *
 * Reads delay settings and Puppeteer options from environment variables,
 * falling back to the defaults in config.ts when not set.
 *
 * Environment variables:
 *
 *   WA_DELAY_MIN           - Minimum delay between messages (ms). Default: 30000
 *   WA_DELAY_MAX           - Maximum delay between messages (ms). Default: 60000
 *   WA_DELAY_PERSONALIZED_MIN - Minimum personalized extra delay (ms). Default: 5000
 *   WA_DELAY_PERSONALIZED_MAX - Maximum personalized extra delay (ms). Default: 10000
 *   WA_PUPPETEER_HEADLESS  - Run browser headless ("true"/"false"). Default: true
 *   WA_CLIENT_ID           - WhatsApp client session ID. Default: "default"
 *   WA_LOG_LEVEL           - Log verbosity ("silent"|"error"|"warn"|"info"|"debug"). Default: "info"
 */

export type LogLevel = 'silent' | 'error' | 'warn' | 'info' | 'debug'

export interface AppConfig {
  delay: DelayConfig
  puppeteer: PuppeteerConfig
  clientId: string
  logLevel: LogLevel
}

/** Parses an env var as an integer, returning the fallback if missing or invalid */
function envInt(key: string, fallback: number): number {
  const raw = process.env[key]
  if (raw === undefined || raw === '') return fallback
  const parsed = parseInt(raw, 10)
  return Number.isNaN(parsed) ? fallback : parsed
}

/** Parses an env var as a boolean ("true" → true), returning the fallback otherwise */
function envBool(key: string, fallback: boolean): boolean {
  const raw = process.env[key]
  if (raw === undefined || raw === '') return fallback
  return raw.toLowerCase() === 'true'
}

/** Parses an env var as a string, returning the fallback if missing */
function envStr(key: string, fallback: string): string {
  const raw = process.env[key]
  return raw !== undefined && raw !== '' ? raw : fallback
}

const VALID_LOG_LEVELS: ReadonlySet<string> = new Set([
  'silent',
  'error',
  'warn',
  'info',
  'debug',
])

/**
 * Loads application configuration from environment variables,
 * merging with defaults for any unset values.
 */
export function loadAppConfig(): AppConfig {
  const logLevelRaw = envStr('WA_LOG_LEVEL', 'info')
  const logLevel: LogLevel = VALID_LOG_LEVELS.has(logLevelRaw)
    ? (logLevelRaw as LogLevel)
    : 'info'

  return {
    delay: {
      min: envInt('WA_DELAY_MIN', DEFAULT_DELAY_CONFIG.min),
      max: envInt('WA_DELAY_MAX', DEFAULT_DELAY_CONFIG.max),
      personalized: {
        min: envInt(
          'WA_DELAY_PERSONALIZED_MIN',
          DEFAULT_DELAY_CONFIG.personalized.min,
        ),
        max: envInt(
          'WA_DELAY_PERSONALIZED_MAX',
          DEFAULT_DELAY_CONFIG.personalized.max,
        ),
      },
    },
    puppeteer: {
      headless: envBool(
        'WA_PUPPETEER_HEADLESS',
        DEFAULT_PUPPETEER_CONFIG.headless,
      ),
      args: DEFAULT_PUPPETEER_CONFIG.args,
    },
    clientId: envStr('WA_CLIENT_ID', 'default'),
    logLevel,
  }
}

/**
 * Prints the current configuration (with safe formatting) for debugging.
 * Omits sensitive values.
 */
export function printConfig(config: AppConfig): void {
  console.log('Current configuration:')
  console.log(`  Client ID:        ${config.clientId}`)
  console.log(`  Log level:        ${config.logLevel}`)
  console.log(`  Delay min:        ${config.delay.min}ms`)
  console.log(`  Delay max:        ${config.delay.max}ms`)
  console.log(`  Personal min:     ${config.delay.personalized.min}ms`)
  console.log(`  Personal max:     ${config.delay.personalized.max}ms`)
  console.log(`  Headless:         ${config.puppeteer.headless}`)
}
