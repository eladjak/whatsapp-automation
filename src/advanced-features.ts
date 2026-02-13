import { MessageMedia } from 'whatsapp-web.js'
import fs from 'fs'
import { createClient } from './client'
import { delay } from './utils'

/**
 * Demonstrates advanced WhatsApp Web features:
 *   1. Multiline messages
 *   2. Image attachments (if test-image.jpg exists)
 *   3. Location sharing
 *   4. Number registration check
 *   5. Chat metadata retrieval
 *
 * Edit the phoneNumber below before running.
 */
function main(): void {
  const phoneNumber = '972501234567' // Replace with actual number
  const chatId = phoneNumber + '@c.us'

  const client = createClient({ clientId: 'client-one' })

  client.on('ready', async () => {
    console.log('WhatsApp ready! Running advanced feature demos:\n')

    try {
      // 1. Multiline message
      console.log('1. Sending multiline message...')
      const multilineMessage = [
        'Hello!',
        '',
        'This is a multiline message.',
        '- Point 1',
        '- Point 2',
        '- Point 3',
        '',
        'Thanks!',
      ].join('\n')
      await client.sendMessage(chatId, multilineMessage)
      await delay(2000)

      // 2. Image (if available)
      if (fs.existsSync('./test-image.jpg')) {
        console.log('2. Sending image...')
        const media = MessageMedia.fromFilePath('./test-image.jpg')
        await client.sendMessage(chatId, media, {
          caption: 'Example image',
        })
        await delay(2000)
      } else {
        console.log('2. Skipping image (no test-image.jpg found)')
      }

      // 3. Number registration check
      console.log('3. Checking number registration...')
      const isRegistered = await client.isRegisteredUser(chatId)
      console.log(
        `   ${phoneNumber} is ${isRegistered ? 'registered' : 'NOT registered'} on WhatsApp`,
      )

      // 4. Chat info
      console.log('4. Fetching chat info...')
      const chat = await client.getChatById(chatId)
      console.log(`   Name: ${chat.name ?? 'N/A'}`)
      console.log(`   Muted: ${chat.isMuted ? 'Yes' : 'No'}`)

      console.log('\nAll demos completed successfully!')

      await client.destroy()
      process.exit(0)
    } catch (error) {
      console.error('Error:', error)
      await client.destroy()
      process.exit(1)
    }
  })

  console.log('Starting WhatsApp Web...')
  client.initialize()
}

main()
