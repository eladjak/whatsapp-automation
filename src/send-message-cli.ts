import { createClient } from './client'

/**
 * CLI tool for sending a single WhatsApp message.
 *
 * Usage:
 *   npx ts-node src/send-message-cli.ts <phone-number> <message>
 *
 * Example:
 *   npx ts-node src/send-message-cli.ts 972501234567 "Hello from CLI!"
 */
function main(): void {
  const args = process.argv.slice(2)

  if (args.length < 2) {
    console.log(
      'Usage: npx ts-node src/send-message-cli.ts <phone-number> <message>',
    )
    console.log(
      'Example: npx ts-node src/send-message-cli.ts 972501234567 "Hello!"',
    )
    process.exit(1)
  }

  const phoneNumber = args[0]
  const message = args.slice(1).join(' ')

  const client = createClient({ clientId: 'client-one' })

  client.on('ready', async () => {
    console.log('WhatsApp ready!')
    console.log(`Sending message to ${phoneNumber}...`)

    try {
      const chatId = phoneNumber + '@c.us'
      await client.sendMessage(chatId, message)

      console.log('Message sent successfully!')
      console.log(`  Phone: ${phoneNumber}`)
      console.log(`  Message: ${message}`)

      await client.destroy()
      process.exit(0)
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      console.error('Error sending message:', errorMessage)
      await client.destroy()
      process.exit(1)
    }
  })

  console.log('Starting WhatsApp Web...')
  client.initialize()
}

main()
