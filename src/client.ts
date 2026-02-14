import { Client, LocalAuth } from 'whatsapp-web.js'
import qrcode from 'qrcode-terminal'
import type { ClientConfig } from './types'
import { DEFAULT_PUPPETEER_CONFIG } from './config'

/** Maximum number of QR code generation attempts before giving up */
const MAX_QR_ATTEMPTS = 5

/**
 * Creates and returns a configured WhatsApp Web client.
 *
 * The client emits standard whatsapp-web.js events: qr, authenticated, ready, disconnected.
 * QR code display and basic logging are wired up automatically.
 *
 * Includes:
 *   - QR code retry tracking (gives up after MAX_QR_ATTEMPTS)
 *   - Authentication failure logging
 *   - Disconnection handling with reason
 */
export function createClient(config: ClientConfig): Client {
  const client = new Client({
    authStrategy: new LocalAuth({
      clientId: config.clientId,
    }),
    puppeteer: config.puppeteer ?? DEFAULT_PUPPETEER_CONFIG,
  })

  let qrAttempts = 0

  client.on('qr', (qr: string) => {
    qrAttempts++

    if (qrAttempts > MAX_QR_ATTEMPTS) {
      console.error(
        `\nQR code generated ${qrAttempts} times without successful scan.`,
      )
      console.error('Please check your phone and try again.\n')
      return
    }

    console.log(
      `\nScan this QR code with WhatsApp on your phone (attempt ${qrAttempts}/${MAX_QR_ATTEMPTS}):\n`,
    )
    qrcode.generate(qr, { small: true })
    console.log(
      '\nOpen WhatsApp > Settings > Linked Devices > Link a Device\n',
    )
  })

  client.on('authenticated', () => {
    qrAttempts = 0
    console.log('Authenticated successfully.')
  })

  client.on('auth_failure', (message: string) => {
    console.error('Authentication failure:', message)
    console.error(
      'Try deleting the .wwebjs_auth/ directory and re-authenticating.',
    )
  })

  client.on('disconnected', (reason: string) => {
    console.log('Disconnected from WhatsApp:', reason)
  })

  client.on('change_state', (state: string) => {
    console.log('Client state changed:', state)
  })

  return client
}
