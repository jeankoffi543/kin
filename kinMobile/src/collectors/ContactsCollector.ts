import Contacts from 'react-native-contacts'
import { executeAsync } from '@/db/database'
import { SyncHash } from '@/lib/crypto'

export async function collectContacts(): Promise<number> {
  let contacts: Contacts.Contact[]
  try {
    contacts = await Contacts.getAll()
  } catch (err) {
    console.error('[ContactsCollector] Failed to read contacts:', err)
    throw err
  }

  console.log(`[ContactsCollector] Read ${contacts.length} contacts from device`)
  if (contacts.length === 0) return 0

  let inserted = 0
  for (const contact of contacts) {
    const firstName = contact.givenName ?? ''
    const lastName = contact.familyName ?? ''
    const name = `${firstName} ${lastName}`.trim()
    if (!name) continue

    for (const phoneEntry of contact.phoneNumbers) {
      const number = (phoneEntry.number ?? '').replace(/[\s\-()]/g, '')
      if (!number) continue

      const syncHash = SyncHash.contact(number, name)
      try {
        const result = await executeAsync(
          `INSERT OR IGNORE INTO contacts (sync_hash, name, phone_number) VALUES (?, ?, ?)`,
          [syncHash, name, number],
        )
        if (result.rowsAffected > 0) inserted++
      } catch (err) {
        console.warn(`[ContactsCollector] Failed to insert contact ${name}:`, err)
      }
    }
  }

  console.log(`[ContactsCollector] Inserted ${inserted} contact entries`)
  return inserted
}
