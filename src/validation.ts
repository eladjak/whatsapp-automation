import type { Contact, BulkSendOptions, DelayConfig } from './types'

/** Validation error with a descriptive message */
export interface ValidationError {
  field: string
  message: string
}

/** Result of a validation check */
export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
}

/** Israeli phone number pattern (with or without country code) */
const PHONE_REGEX = /^\+?\d{9,15}$/

/**
 * Validates a phone number string.
 * Strips non-digit characters (except leading +) before checking.
 */
export function isValidPhone(phone: string): boolean {
  const cleaned = phone.replace(/[\s\-()]/g, '')
  return PHONE_REGEX.test(cleaned)
}

/**
 * Validates a single contact object.
 * Returns a list of validation errors (empty if valid).
 */
export function validateContact(contact: Contact, index: number): ValidationError[] {
  const errors: ValidationError[] = []
  const prefix = `contacts[${index}]`

  if (!contact.name || contact.name.trim().length === 0) {
    errors.push({ field: `${prefix}.name`, message: 'Name is required' })
  }

  if (!contact.phone || contact.phone.trim().length === 0) {
    errors.push({ field: `${prefix}.phone`, message: 'Phone number is required' })
  } else if (!isValidPhone(contact.phone)) {
    errors.push({
      field: `${prefix}.phone`,
      message: `Invalid phone number format: "${contact.phone}" (expected 9-15 digits, optional + prefix)`,
    })
  }

  return errors
}

/**
 * Validates an array of contacts for bulk sending.
 * Returns all validation errors found across all contacts.
 */
export function validateContacts(contacts: Contact[]): ValidationResult {
  if (!Array.isArray(contacts)) {
    return {
      valid: false,
      errors: [{ field: 'contacts', message: 'Contacts must be an array' }],
    }
  }

  if (contacts.length === 0) {
    return {
      valid: false,
      errors: [{ field: 'contacts', message: 'Contact list is empty' }],
    }
  }

  const errors: ValidationError[] = []

  for (let i = 0; i < contacts.length; i++) {
    const contactErrors = validateContact(contacts[i], i)
    errors.push(...contactErrors)
  }

  // Check for duplicate phone numbers
  const phones = new Map<string, number[]>()
  contacts.forEach((contact, index) => {
    if (contact.phone) {
      const normalized = contact.phone.replace(/\D/g, '')
      const existing = phones.get(normalized)
      if (existing) {
        existing.push(index)
      } else {
        phones.set(normalized, [index])
      }
    }
  })

  for (const [phone, indices] of phones) {
    if (indices.length > 1) {
      errors.push({
        field: 'contacts',
        message: `Duplicate phone number "${phone}" found at indices: ${indices.join(', ')}`,
      })
    }
  }

  return { valid: errors.length === 0, errors }
}

/**
 * Validates a message template string.
 * Ensures it is non-empty and contains valid placeholders.
 */
export function validateMessageTemplate(template: string): ValidationResult {
  const errors: ValidationError[] = []

  if (!template || template.trim().length === 0) {
    errors.push({ field: 'messageTemplate', message: 'Message template is required' })
    return { valid: false, errors }
  }

  if (template.trim().length > 10_000) {
    errors.push({
      field: 'messageTemplate',
      message: 'Message template exceeds maximum length of 10,000 characters',
    })
  }

  // Check for unknown placeholders
  const validPlaceholders = new Set([
    'name',
    'firstName',
    'lastName',
    'company',
    'customField',
  ])
  const placeholderRegex = /\{(\w+)\}/g
  let match: RegExpExecArray | null

  while ((match = placeholderRegex.exec(template)) !== null) {
    if (!validPlaceholders.has(match[1])) {
      errors.push({
        field: 'messageTemplate',
        message: `Unknown placeholder "{${match[1]}}". Valid: {${[...validPlaceholders].join('}, {')}}`,
      })
    }
  }

  return { valid: errors.length === 0, errors }
}

/**
 * Validates delay configuration values.
 * Ensures min <= max and values are non-negative.
 */
export function validateDelayConfig(config: DelayConfig): ValidationResult {
  const errors: ValidationError[] = []

  if (config.min < 0) {
    errors.push({ field: 'delay.min', message: 'Minimum delay cannot be negative' })
  }
  if (config.max < 0) {
    errors.push({ field: 'delay.max', message: 'Maximum delay cannot be negative' })
  }
  if (config.min > config.max) {
    errors.push({
      field: 'delay',
      message: `Minimum delay (${config.min}) cannot exceed maximum (${config.max})`,
    })
  }
  if (config.personalized.min < 0) {
    errors.push({
      field: 'delay.personalized.min',
      message: 'Personalized minimum delay cannot be negative',
    })
  }
  if (config.personalized.max < 0) {
    errors.push({
      field: 'delay.personalized.max',
      message: 'Personalized maximum delay cannot be negative',
    })
  }
  if (config.personalized.min > config.personalized.max) {
    errors.push({
      field: 'delay.personalized',
      message: `Personalized minimum (${config.personalized.min}) cannot exceed maximum (${config.personalized.max})`,
    })
  }

  return { valid: errors.length === 0, errors }
}

/** Formats validation errors into a human-readable string */
export function formatValidationErrors(result: ValidationResult): string {
  if (result.valid) return 'Validation passed.'
  return result.errors
    .map((e) => `  - [${e.field}] ${e.message}`)
    .join('\n')
}
