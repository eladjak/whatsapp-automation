import type { Client } from 'whatsapp-web.js'
import fs from 'fs'
import type {
  Contact,
  BulkSendResults,
  BulkSendOptions,
  DelayConfig,
} from './types'
import { DEFAULT_DELAY_CONFIG } from './config'
import { getRandomDelay, delay, personalizeMessage } from './utils'
import { createClient } from './client'
import { loadContacts } from './contacts'
import {
  validateContacts,
  validateMessageTemplate,
  validateDelayConfig,
  formatValidationErrors,
} from './validation'
import { loadAppConfig } from './env-config'

/** Maximum number of consecutive failures before aborting the send */
const MAX_CONSECUTIVE_FAILURES = 5

/**
 * Sends personalized messages to a list of contacts with rate-limiting.
 *
 * Includes natural random delays between messages to avoid WhatsApp bans.
 * Optionally validates phone numbers are registered before sending.
 * Validates all inputs before starting and aborts on repeated failures.
 */
export async function sendBulkMessages(
  client: Client,
  contacts: Contact[],
  messageTemplate: string,
  options: BulkSendOptions = {},
  delayConfig: DelayConfig = DEFAULT_DELAY_CONFIG,
): Promise<BulkSendResults> {
  // --- Input validation ---
  const contactValidation = validateContacts(contacts)
  if (!contactValidation.valid) {
    console.error('Contact validation failed:')
    console.error(formatValidationErrors(contactValidation))
    return {
      total: contacts.length,
      sent: 0,
      failed: 0,
      skipped: contacts.length,
      details: contacts.map((contact) => ({
        contact,
        status: 'skipped' as const,
        reason: 'Validation failed before sending',
      })),
    }
  }

  const templateValidation = validateMessageTemplate(messageTemplate)
  if (!templateValidation.valid) {
    console.error('Message template validation failed:')
    console.error(formatValidationErrors(templateValidation))
    return {
      total: contacts.length,
      sent: 0,
      failed: 0,
      skipped: contacts.length,
      details: contacts.map((contact) => ({
        contact,
        status: 'skipped' as const,
        reason: 'Invalid message template',
      })),
    }
  }

  const delayValidation = validateDelayConfig(delayConfig)
  if (!delayValidation.valid) {
    console.error('Delay config validation failed:')
    console.error(formatValidationErrors(delayValidation))
    return {
      total: contacts.length,
      sent: 0,
      failed: 0,
      skipped: contacts.length,
      details: contacts.map((contact) => ({
        contact,
        status: 'skipped' as const,
        reason: 'Invalid delay configuration',
      })),
    }
  }

  // --- Send loop ---
  const results: BulkSendResults = {
    total: contacts.length,
    sent: 0,
    failed: 0,
    skipped: 0,
    details: [],
  }

  let consecutiveFailures = 0

  console.log(`\nStarting send to ${contacts.length} recipients...\n`)

  for (let i = 0; i < contacts.length; i++) {
    const contact = contacts[i]
    const progress = `[${i + 1}/${contacts.length}]`

    // Abort if too many consecutive failures (likely a connectivity issue)
    if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
      console.error(
        `\nAborting: ${MAX_CONSECUTIVE_FAILURES} consecutive failures detected. ` +
          'Possible connectivity issue.',
      )
      // Mark remaining contacts as skipped
      for (let j = i; j < contacts.length; j++) {
        results.skipped++
        results.details.push({
          contact: contacts[j],
          status: 'skipped',
          reason: 'Aborted due to consecutive failures',
        })
      }
      break
    }

    try {
      if (!contact.phone) {
        console.log(
          `${progress} Skipping - no phone number for ${contact.name ?? 'Unknown'}`,
        )
        results.skipped++
        results.details.push({
          contact,
          status: 'skipped',
          reason: 'No phone number',
        })
        continue
      }

      const chatId = contact.phone.replace(/\D/g, '') + '@c.us'

      if (options.validateNumbers) {
        try {
          const isRegistered = await client.isRegisteredUser(chatId)
          if (!isRegistered) {
            console.log(
              `${progress} ${contact.name ?? contact.phone} - number not registered on WhatsApp`,
            )
            results.skipped++
            results.details.push({
              contact,
              status: 'skipped',
              reason: 'Not registered',
            })
            continue
          }
        } catch (regError) {
          const regMessage =
            regError instanceof Error ? regError.message : String(regError)
          console.log(
            `${progress} Warning: Could not verify registration for ${contact.name ?? contact.phone}: ${regMessage}`,
          )
          // Continue to send anyway - the validation is optional
        }
      }

      const personalizedMsg = personalizeMessage(messageTemplate, contact)
      await client.sendMessage(chatId, personalizedMsg)

      console.log(`${progress} Sent to ${contact.name ?? contact.phone}`)
      results.sent++
      results.details.push({ contact, status: 'sent' })
      consecutiveFailures = 0 // Reset on success

      if (i < contacts.length - 1) {
        const waitTime = getRandomDelay(delayConfig.min, delayConfig.max)
        const additionalDelay = options.personalize
          ? getRandomDelay(
              delayConfig.personalized.min,
              delayConfig.personalized.max,
            )
          : 0

        const totalDelay = waitTime + additionalDelay
        console.log(
          `   Waiting ${(totalDelay / 1000).toFixed(1)} seconds...\n`,
        )
        await delay(totalDelay)
      }
    } catch (error) {
      consecutiveFailures++
      const message = error instanceof Error ? error.message : String(error)
      console.log(
        `${progress} Error sending to ${contact.name ?? contact.phone}: ${message}`,
      )
      results.failed++
      results.details.push({ contact, status: 'failed', error: message })

      if (i < contacts.length - 1) {
        // Increase delay after failures to back off
        const backoffMultiplier = Math.min(consecutiveFailures, 3)
        const backoffDelay =
          getRandomDelay(delayConfig.min, delayConfig.max) * backoffMultiplier
        console.log(
          `   Backing off for ${(backoffDelay / 1000).toFixed(1)} seconds (failure #${consecutiveFailures})...\n`,
        )
        await delay(backoffDelay)
      }
    }
  }

  return results
}

/** Prints a summary of bulk send results to the console */
function printSummary(results: BulkSendResults): void {
  console.log('\n' + '='.repeat(50))
  console.log('Send Summary:')
  console.log('='.repeat(50))
  console.log(`Sent successfully: ${results.sent}/${results.total}`)
  console.log(`Failed: ${results.failed}`)
  console.log(`Skipped: ${results.skipped}`)
  console.log('='.repeat(50) + '\n')
}

/** Saves a detailed JSON report of the send results */
function saveReport(results: BulkSendResults): void {
  const reportFile = `report_${Date.now()}.json`
  fs.writeFileSync(reportFile, JSON.stringify(results, null, 2))
  console.log(`Detailed report saved to ${reportFile}\n`)
}

// --- CLI Entry Point ---

function main(): void {
  const args = process.argv.slice(2)

  if (args.length < 2) {
    console.log(`
WhatsApp Bulk Sender

Usage:
  npx ts-node src/bulk-sender.ts <contacts-file> <message-file> [options]

Contacts file:
  - JSON: array of objects with {name, phone, firstName, ...}
  - CSV: columns: name,phone,firstName,...

Message file:
  - Text file with the message to send
  - Supports placeholders: {name}, {firstName}, {lastName}, {company}, {customField}

Examples:
  npx ts-node src/bulk-sender.ts contacts.json message.txt
  npx ts-node src/bulk-sender.ts contacts.csv message.txt --validate

Options:
  --validate    Verify all numbers are registered on WhatsApp before sending
  --no-delay    Send without delays (not recommended - risk of ban!)
  --dry-run     Validate inputs without actually sending messages

Environment variables (override defaults):
  WA_DELAY_MIN, WA_DELAY_MAX, WA_DELAY_PERSONALIZED_MIN, WA_DELAY_PERSONALIZED_MAX
  WA_CLIENT_ID, WA_PUPPETEER_HEADLESS, WA_LOG_LEVEL
    `)
    process.exit(1)
  }

  const contactsFile = args[0]
  const messageFile = args[1]
  const isDryRun = args.includes('--dry-run')
  const options: BulkSendOptions = {
    validateNumbers: args.includes('--validate'),
    noDelay: args.includes('--no-delay'),
    personalize: true,
  }

  // Load config from environment
  const appConfig = loadAppConfig()

  let messageTemplate: string
  try {
    messageTemplate = fs.readFileSync(messageFile, 'utf8')
  } catch {
    console.error(`Cannot read message file: ${messageFile}`)
    process.exit(1)
  }

  const contacts = loadContacts(contactsFile)
  if (!contacts || contacts.length === 0) {
    console.error('No contacts found.')
    process.exit(1)
  }

  // Validate inputs early
  const contactValidation = validateContacts(contacts)
  if (!contactValidation.valid) {
    console.error('Contact validation errors:')
    console.error(formatValidationErrors(contactValidation))
    process.exit(1)
  }

  const templateValidation = validateMessageTemplate(messageTemplate)
  if (!templateValidation.valid) {
    console.error('Message template validation errors:')
    console.error(formatValidationErrors(templateValidation))
    process.exit(1)
  }

  console.log(`Loaded ${contacts.length} contacts from ${contactsFile}`)
  console.log(`Loaded message from ${messageFile}`)

  const delayConfig: DelayConfig = options.noDelay
    ? { min: 0, max: 100, personalized: { min: 0, max: 0 } }
    : appConfig.delay

  if (options.noDelay) {
    console.log('WARNING: No-delay mode enabled. This may lead to a ban!')
  }

  if (isDryRun) {
    console.log('\n--- DRY RUN ---')
    console.log(`Contacts validated: ${contacts.length}`)
    console.log(`Message template validated: ${messageTemplate.length} characters`)
    console.log('Delay config:', JSON.stringify(delayConfig, null, 2))
    console.log('All validations passed. Ready to send.')
    process.exit(0)
  }

  const client = createClient({
    clientId: appConfig.clientId,
    puppeteer: appConfig.puppeteer,
  })

  // Add a timeout for the ready event
  const READY_TIMEOUT_MS = 120_000 // 2 minutes
  const readyTimeout = setTimeout(() => {
    console.error(
      `WhatsApp client did not become ready within ${READY_TIMEOUT_MS / 1000} seconds.`,
    )
    console.error('Please check your connection and try again.')
    process.exit(1)
  }, READY_TIMEOUT_MS)

  client.on('ready', async () => {
    clearTimeout(readyTimeout)
    console.log('WhatsApp ready!\n')

    try {
      const results = await sendBulkMessages(
        client,
        contacts,
        messageTemplate,
        options,
        delayConfig,
      )
      printSummary(results)
      saveReport(results)

      await client.destroy()
      process.exit(0)
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : String(error)
      console.error('Fatal error during bulk send:', errorMsg)
      try {
        await client.destroy()
      } catch {
        // Ignore destroy errors during cleanup
      }
      process.exit(1)
    }
  })

  client.on('auth_failure', (message: string) => {
    clearTimeout(readyTimeout)
    console.error('Authentication failed:', message)
    console.error('Please delete .wwebjs_auth/ and re-authenticate.')
    process.exit(1)
  })

  console.log('Starting WhatsApp Web...')

  try {
    client.initialize()
  } catch (error) {
    clearTimeout(readyTimeout)
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error('Failed to initialize WhatsApp client:', errorMsg)
    process.exit(1)
  }
}

main()
