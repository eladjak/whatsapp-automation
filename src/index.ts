export type {
  Contact,
  SendDetail,
  BulkSendResults,
  BulkSendOptions,
  DelayConfig,
  PuppeteerConfig,
  ClientConfig,
} from './types'

export { DEFAULT_DELAY_CONFIG, DEFAULT_PUPPETEER_CONFIG } from './config'
export { createClient } from './client'
export { loadContacts, loadContactsFromJSON, loadContactsFromCSV } from './contacts'
export { sendBulkMessages } from './bulk-sender'
export { getRandomDelay, delay, personalizeMessage } from './utils'

export type { ValidationError, ValidationResult } from './validation'
export {
  isValidPhone,
  validateContact,
  validateContacts,
  validateMessageTemplate,
  validateDelayConfig,
  formatValidationErrors,
} from './validation'

export type { LogLevel, AppConfig } from './env-config'
export { loadAppConfig, printConfig } from './env-config'
