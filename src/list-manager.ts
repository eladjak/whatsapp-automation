import fs from 'fs'
import readline from 'readline'
import type { Contact } from './types'

/**
 * Interactive contact list manager.
 *
 * Provides a CLI menu for creating, editing, viewing, and exporting
 * contact lists used by the bulk sender.
 */

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

function question(query: string): Promise<string> {
  return new Promise((resolve) => rl.question(query, resolve))
}

/** Lists all JSON files in the current directory (excluding package.json) */
function listJsonFiles(): string[] {
  return fs
    .readdirSync('.')
    .filter((f) => f.endsWith('.json') && !f.includes('package'))
}

/** Prompts the user to select a JSON file from the current directory */
async function selectListFile(): Promise<string | null> {
  const jsonFiles = listJsonFiles()

  if (jsonFiles.length === 0) {
    console.log('No lists found.')
    return null
  }

  console.log('Available lists:')
  jsonFiles.forEach((file, i) => {
    console.log(`${i + 1}. ${file}`)
  })

  const choice = await question('\nSelect list number: ')
  const selected = jsonFiles[parseInt(choice, 10) - 1]

  if (!selected) {
    console.log('Invalid selection.')
    return null
  }

  return selected
}

/** Reads and parses a JSON contact list file */
function readContactList(filePath: string): Contact[] | null {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8')) as Contact[]
  } catch {
    console.log('Error reading list file.')
    return null
  }
}

/** Prompts for contact details and returns a Contact object */
async function promptContact(): Promise<Contact | null> {
  const name = await question('Full name: ')
  if (!name.trim()) return null

  const firstName = await question(
    'First name (or Enter to use first word of name): ',
  )
  const lastName = await question('Last name (or Enter): ')
  const phone = await question('Phone number (format: 972501234567): ')
  const company = await question('Company (optional): ')
  const customField = await question('Custom field (optional): ')

  return {
    name: name.trim(),
    firstName: firstName.trim() || name.trim().split(' ')[0],
    lastName: lastName.trim() || name.trim().split(' ').slice(1).join(' '),
    phone: phone.trim().replace(/\D/g, ''),
    company: company.trim() || undefined,
    customField: customField.trim() || undefined,
  }
}

async function createNewList(): Promise<void> {
  console.log('\nCreate new contact list\n')

  const listName = await question('List name: ')
  const contacts: Contact[] = []

  console.log('\nAdd contacts (press Enter without a name to finish):\n')

  while (true) {
    const contact = await promptContact()
    if (!contact) break
    contacts.push(contact)
    console.log(`Added ${contact.name}\n`)
  }

  if (contacts.length === 0) {
    console.log('No contacts added.')
    return
  }

  const fileName = `${listName.replace(/\s+/g, '_')}_${Date.now()}.json`
  fs.writeFileSync(fileName, JSON.stringify(contacts, null, 2))

  console.log(`\nList saved to ${fileName}`)
  console.log(`  Total: ${contacts.length} contacts`)
}

async function addToExistingList(): Promise<void> {
  console.log('\nAdd to existing list\n')

  const selectedFile = await selectListFile()
  if (!selectedFile) return

  const contacts = readContactList(selectedFile)
  if (!contacts) return

  console.log(`\nLoaded list with ${contacts.length} contacts`)
  console.log('\nAdd new contacts (Enter without a name to finish):\n')

  let added = 0
  while (true) {
    const contact = await promptContact()
    if (!contact) break
    contacts.push(contact)
    added++
    console.log(`Added (${contacts.length} total)\n`)
  }

  if (added > 0) {
    fs.writeFileSync(selectedFile, JSON.stringify(contacts, null, 2))
    console.log(`\n${added} contacts added to ${selectedFile}`)
  }
}

async function viewList(): Promise<void> {
  console.log('\nView list\n')

  const selectedFile = await selectListFile()
  if (!selectedFile) return

  const contacts = readContactList(selectedFile)
  if (!contacts) return

  console.log(`\n${selectedFile} (${contacts.length} contacts)\n`)
  console.log('='.repeat(70))

  contacts.forEach((contact, i) => {
    console.log(`${i + 1}. ${contact.name}`)
    console.log(`   Phone: ${contact.phone}`)
    if (contact.company) console.log(`   Company: ${contact.company}`)
    if (contact.customField) console.log(`   Custom: ${contact.customField}`)
    console.log('')
  })

  console.log('='.repeat(70))
}

async function exportToCSV(): Promise<void> {
  console.log('\nExport to CSV\n')

  const selectedFile = await selectListFile()
  if (!selectedFile) return

  const contacts = readContactList(selectedFile)
  if (!contacts) return

  const headers: (keyof Contact)[] = [
    'name',
    'firstName',
    'lastName',
    'phone',
    'company',
    'customField',
  ]
  const csv = [
    headers.join(','),
    ...contacts.map((c) => headers.map((h) => c[h] ?? '').join(',')),
  ].join('\n')

  const csvFile = selectedFile.replace('.json', '.csv')
  fs.writeFileSync(csvFile, csv)

  console.log(`Exported to ${csvFile}`)
}

async function mainMenu(): Promise<void> {
  while (true) {
    console.log('\n' + '='.repeat(50))
    console.log('WhatsApp Contact List Manager')
    console.log('='.repeat(50))
    console.log('1. Create new list')
    console.log('2. Add to existing list')
    console.log('3. View list')
    console.log('4. Export to CSV')
    console.log('5. Exit')
    console.log('='.repeat(50))

    const choice = await question('\nSelect option (1-5): ')

    switch (choice.trim()) {
      case '1':
        await createNewList()
        break
      case '2':
        await addToExistingList()
        break
      case '3':
        await viewList()
        break
      case '4':
        await exportToCSV()
        break
      case '5':
        console.log('\nGoodbye!\n')
        rl.close()
        return
      default:
        console.log('Invalid selection.')
    }
  }
}

console.log('WhatsApp Contact List Manager')
mainMenu().catch(console.error)
