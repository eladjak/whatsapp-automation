import { createClient } from './client'

/**
 * Simple single-message sender.
 *
 * Connects to WhatsApp Web, sends one message to a hardcoded number,
 * then disconnects. Edit the phoneNumber and message below before running.
 */
function main(): void {
  const phoneNumber = '972501234567' // Replace with actual number
  const message = 'Hello! This is an automated message.'

  const client = createClient({ clientId: 'client-one' })

  client.on('ready', async () => {
    console.log('WhatsApp ready!')

    try {
      const chatId = phoneNumber + '@c.us'
      await client.sendMessage(chatId, message)
      console.log(`Message sent to ${phoneNumber}`)

      await client.destroy()
      process.exit(0)
    } catch (error) {
      console.error('Error sending message:', error)
      process.exit(1)
    }
  })

  console.log('Starting WhatsApp Web...')
  client.initialize()
}

main()
