/**
 * File Service - API client for the Express backend server
 */

import type { Dye, LocaleData, LocaleCode, WriteResult } from '@/types'
import { fetchWithTimeout } from '@/utils/fetchWithTimeout'

const SERVER_BASE = 'http://localhost:3001/api'

/**
 * Session token for authentication
 * Stored in memory only (not persisted)
 * Obtained from POST /api/auth/session on server health check
 */
let sessionToken: string | null = null

/**
 * Get or create a session token
 * @returns Session token for authentication
 */
async function getSessionToken(): Promise<string> {
  // Return cached token if available
  if (sessionToken) {
    return sessionToken
  }

  // Request a new session token from the server
  try {
    const response = await fetchWithTimeout(
      `${SERVER_BASE}/auth/session`,
      {
        method: 'POST',
      },
      15000 // 15s timeout
    )

    if (!response.ok) {
      throw new Error('Failed to create session')
    }

    const data = await response.json()
    sessionToken = data.token
    return sessionToken!
  } catch (error) {
    console.error('Failed to get session token:', error)
    throw error
  }
}

/**
 * Create headers for mutation requests (includes session token)
 */
function getMutationHeaders(): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'X-Session-Token': sessionToken!,
  }
}

/**
 * Check if the server is running
 * Also establishes a session for authenticated mutations
 */
export async function checkServerHealth(): Promise<boolean> {
  try {
    const response = await fetchWithTimeout(`${SERVER_BASE}/health`, {}, 15000)
    const data = await response.json()

    if (data.status === 'ok') {
      // Establish session on successful health check
      await getSessionToken()
      return true
    }

    return false
  } catch {
    return false
  }
}

/**
 * Read colors_xiv.json
 */
export async function readColorsJson(): Promise<Dye[]> {
  const response = await fetchWithTimeout(`${SERVER_BASE}/colors`, {}, 15000)
  if (!response.ok) {
    throw new Error('Failed to read colors file')
  }
  return response.json()
}

/**
 * Write colors_xiv.json
 */
export async function writeColorsJson(dyes: Dye[]): Promise<WriteResult> {
  const response = await fetchWithTimeout(
    `${SERVER_BASE}/colors`,
    {
      method: 'POST',
      headers: getMutationHeaders(),
      body: JSON.stringify(dyes),
    },
    30000 // 30s timeout for file write operations
  )
  return response.json()
}

/**
 * Read a locale JSON file
 */
export async function readLocaleJson(locale: LocaleCode): Promise<LocaleData> {
  const response = await fetchWithTimeout(`${SERVER_BASE}/locale/${locale}`, {}, 15000)
  if (!response.ok) {
    throw new Error(`Failed to read locale file: ${locale}`)
  }
  return response.json()
}

/**
 * Write a locale JSON file
 */
export async function writeLocaleJson(
  locale: LocaleCode,
  data: LocaleData
): Promise<WriteResult> {
  const response = await fetchWithTimeout(
    `${SERVER_BASE}/locale/${locale}`,
    {
      method: 'POST',
      headers: getMutationHeaders(),
      body: JSON.stringify(data),
    },
    30000 // 30s timeout for file write operations
  )
  return response.json()
}

/**
 * Check if an item ID already exists
 */
export async function checkDuplicateItemId(itemId: number): Promise<boolean> {
  const response = await fetchWithTimeout(`${SERVER_BASE}/validate/${itemId}`, {}, 15000)
  if (!response.ok) {
    throw new Error('Failed to validate item ID')
  }
  const data = await response.json()
  return data.exists
}

/**
 * Get all locale labels (for prefix stripping)
 */
export async function getLocaleLabels(): Promise<Record<string, string>> {
  const response = await fetchWithTimeout(`${SERVER_BASE}/locales/labels`, {}, 15000)
  if (!response.ok) {
    throw new Error('Failed to get locale labels')
  }
  return response.json()
}

/**
 * Add a new dye to the database
 */
export async function addDyeToDatabase(
  dye: Dye,
  localeNames: Record<LocaleCode, string>
): Promise<{ success: boolean; errors: string[] }> {
  const errors: string[] = []

  try {
    // 1. Read current colors
    const dyes = await readColorsJson()

    // 2. Add new dye
    dyes.push(dye)

    // 3. Write updated colors
    const colorsResult = await writeColorsJson(dyes)
    if (!colorsResult.success) {
      errors.push(colorsResult.error || 'Failed to write colors file')
      return { success: false, errors }
    }

    // 4. Update each locale file
    const locales: LocaleCode[] = ['en', 'ja', 'de', 'fr', 'ko', 'zh']
    for (const locale of locales) {
      try {
        const localeData = await readLocaleJson(locale)

        // Add dye name
        if (dye.itemID !== null) {
          localeData.dyeNames[String(dye.itemID)] = localeNames[locale] || ''
        }

        // Update meta
        localeData.meta.dyeCount = Object.keys(localeData.dyeNames).length
        localeData.meta.generated = new Date().toISOString()

        // Write updated locale
        const localeResult = await writeLocaleJson(locale, localeData)
        if (!localeResult.success) {
          errors.push(`Failed to update ${locale} locale: ${localeResult.error}`)
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        errors.push(`Failed to update ${locale} locale: ${message}`)
      }
    }

    return { success: errors.length === 0, errors }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    errors.push(message)
    return { success: false, errors }
  }
}
