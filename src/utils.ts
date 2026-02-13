import type { Contact } from './types'

/** Returns a random integer between min and max (inclusive) */
export function getRandomDelay(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

/** Promise-based delay */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Replaces placeholders in a message template with contact data.
 *
 * Supported placeholders:
 *   {name}, {firstName}, {lastName}, {company}, {customField}
 */
export function personalizeMessage(template: string, contact: Contact): string {
  const firstName = contact.firstName ?? contact.name?.split(' ')[0] ?? ''
  const lastName =
    contact.lastName ?? contact.name?.split(' ').slice(1).join(' ') ?? ''

  return template
    .replace(/{name}/g, contact.name ?? '')
    .replace(/{firstName}/g, firstName)
    .replace(/{lastName}/g, lastName)
    .replace(/{company}/g, contact.company ?? '')
    .replace(/{customField}/g, contact.customField ?? '')
}
