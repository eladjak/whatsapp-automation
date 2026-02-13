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

/**
 * Sends personalized messages to a list of contacts with rate-limiting.
 *
 * Includes natural random delays between messages to avoid WhatsApp bans.
 * Optionally validates phone numbers are registered before sending.
 */
export async function sendBulkMessages(
  client: Client,
  contacts: Contact[],
  messageTemplate: string,
  options: BulkSendOptions = {},
  delayConfig: DelayConfig = DEFAULT_DELAY_CONFIG,
): Promise<BulkSendResults> {
  const results: BulkSendResults = {
    total: contacts.length,
    sent: 0,
    failed: 0,
    skipped: 0,
    details: [],
  }

  console.log(`\nStarting send to ${contacts.length} recipients...\n`)

  for (let i = 0; i < contacts.length; i++) {
    const contact = contacts[i]
    const progress = `[${i + 1}/${contacts.length}]`

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
      }

      const personalizedMsg = personalizeMessage(messageTemplate, contact)
      await client.sendMessage(chatId, personalizedMsg)

      console.log(`${progress} Sent to ${contact.name ?? contact.phone}`)
      results.sent++
      results.details.push({ contact, status: 'sent' })

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
      const message = error instanceof Error ? error.message : String(error)
      console.log(
        `${progress} Error sending to ${contact.name ?? contact.phone}: ${message}`,
      )
      results.failed++
      results.details.push({ contact, status: 'failed', error: message })

      if (i < contacts.length - 1) {
        await delay(getRandomDelay(delayConfig.min, delayConfig.max))
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
    `)
    process.exit(1)
  }

  const contactsFile = args[0]
  const messageFile = args[1]
  const options: BulkSendOptions = {
    validateNumbers: args.includes('--validate'),
    noDelay: args.includes('--no-delay'),
    personalize: true,
  }

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

  console.log(`Loaded ${contacts.length} contacts from ${contactsFile}`)
  console.log(`Loaded message from ${messageFile}`)

  const delayConfig: DelayConfig = options.noDelay
    ? { min: 0, max: 100, personalized: { min: 0, max: 0 } }
    : DEFAULT_DELAY_CONFIG

  if (options.noDelay) {
    console.log('WARNING: No-delay mode enabled. This may lead to a ban!')
  }

  const client = createClient({ clientId: 'bulk-sender' })

  client.on('ready', async () => {
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
      console.error('Fatal error:', error)
      await client.destroy()
      process.exit(1)
    }
  })

  console.log('Starting WhatsApp Web...')
  client.initialize()
}

main()
