import fs from 'fs'
import type { Contact } from './types'

/**
 * Loads a contact list from a JSON file.
 * The file must contain an array of Contact objects.
 */
export function loadContactsFromJSON(filePath: string): Contact[] | null {
  try {
    const data = fs.readFileSync(filePath, 'utf8')
    return JSON.parse(data) as Contact[]
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`Error reading file ${filePath}:`, message)
    return null
  }
}

/**
 * Loads a contact list from a CSV file.
 * The first row must be column headers matching Contact field names.
 */
export function loadContactsFromCSV(filePath: string): Contact[] | null {
  try {
    const data = fs.readFileSync(filePath, 'utf8')
    const lines = data.split('\n').filter((line) => line.trim())

    if (lines.length < 2) {
      console.error(`CSV file ${filePath} has no data rows.`)
      return null
    }

    const headers = lines[0].split(',').map((h) => h.trim())

    const contacts: Contact[] = lines.slice(1).map((line) => {
      const values = line.split(',').map((v) => v.trim())
      const contact: Record<string, string> = {}
      headers.forEach((header, index) => {
        contact[header] = values[index] ?? ''
      })
      return contact as unknown as Contact
    })

    return contacts
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`Error reading file ${filePath}:`, message)
    return null
  }
}

/**
 * Loads contacts from a file, auto-detecting format by extension.
 * Supports .json and .csv files.
 */
export function loadContacts(filePath: string): Contact[] | null {
  if (filePath.endsWith('.json')) {
    return loadContactsFromJSON(filePath)
  }
  if (filePath.endsWith('.csv')) {
    return loadContactsFromCSV(filePath)
  }
  console.error('Unsupported file format. Use JSON or CSV.')
  return null
}
