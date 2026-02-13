import { Client, LocalAuth } from 'whatsapp-web.js'
import qrcode from 'qrcode-terminal'
import type { ClientConfig } from './types'
import { DEFAULT_PUPPETEER_CONFIG } from './config'

/**
 * Creates and returns a configured WhatsApp Web client.
 *
 * The client emits standard whatsapp-web.js events: qr, authenticated, ready, disconnected.
 * QR code display and basic logging are wired up automatically.
 */
export function createClient(config: ClientConfig): Client {
  const client = new Client({
    authStrategy: new LocalAuth({
      clientId: config.clientId,
    }),
    puppeteer: config.puppeteer ?? DEFAULT_PUPPETEER_CONFIG,
  })

  client.on('qr', (qr: string) => {
    console.log('\nScan this QR code with WhatsApp on your phone:\n')
    qrcode.generate(qr, { small: true })
    console.log(
      '\nOpen WhatsApp > Settings > Linked Devices > Link a Device\n',
    )
  })

  client.on('authenticated', () => {
    console.log('Authenticated successfully.')
  })

  client.on('disconnected', (reason: string) => {
    console.log('Disconnected from WhatsApp:', reason)
  })

  return client
}
