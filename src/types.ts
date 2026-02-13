/** Contact information for messaging */
export interface Contact {
  name: string
  firstName?: string
  lastName?: string
  phone: string
  company?: string
  customField?: string
}

/** Result of a single message send attempt */
export interface SendDetail {
  contact: Contact
  status: 'sent' | 'failed' | 'skipped'
  reason?: string
  error?: string
}

/** Aggregated results from a bulk send operation */
export interface BulkSendResults {
  total: number
  sent: number
  failed: number
  skipped: number
  details: SendDetail[]
}

/** Options for the bulk send operation */
export interface BulkSendOptions {
  validateNumbers?: boolean
  noDelay?: boolean
  personalize?: boolean
}

/** Delay configuration for rate limiting */
export interface DelayConfig {
  min: number
  max: number
  personalized: {
    min: number
    max: number
  }
}

/** Puppeteer launch options for whatsapp-web.js */
export interface PuppeteerConfig {
  headless: boolean
  args: string[]
}

/** WhatsApp client configuration */
export interface ClientConfig {
  clientId: string
  puppeteer?: PuppeteerConfig
}
