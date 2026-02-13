import type { DelayConfig, PuppeteerConfig } from './types'

/**
 * Delay configuration for rate-limiting message sends.
 *
 * WhatsApp bans accounts that send 100+ messages within 5 minutes.
 * These defaults simulate human-like intervals to stay safe.
 */
export const DEFAULT_DELAY_CONFIG: DelayConfig = {
  min: 30_000,
  max: 60_000,
  personalized: {
    min: 5_000,
    max: 10_000,
  },
}

/** Default Puppeteer options for headless Chrome */
export const DEFAULT_PUPPETEER_CONFIG: PuppeteerConfig = {
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
}
