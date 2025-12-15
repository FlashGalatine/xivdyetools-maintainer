/**
 * File Service - API client for the Express backend server
 */

import type { Dye, LocaleData, LocaleCode, WriteResult } from '@/types'

const SERVER_BASE = 'http://localhost:3001/api'

/**
 * Get the API key from environment variable
 * This is required for write operations (POST/PUT/DELETE)
 */
function getApiKey(): string {
  return import.meta.env.VITE_MAINTAINER_API_KEY || ''
}

/**
 * Create headers for mutation requests (includes API key)
 */
function getMutationHeaders(): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'X-API-Key': getApiKey(),
  }
}

/**
 * Check if the server is running
 */
export async function checkServerHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${SERVER_BASE}/health`)
    const data = await response.json()
    return data.status === 'ok'
  } catch {
    return false
  }
}

/**
 * Read colors_xiv.json
 */
export async function readColorsJson(): Promise<Dye[]> {
  const response = await fetch(`${SERVER_BASE}/colors`)
  if (!response.ok) {
    throw new Error('Failed to read colors file')
  }
  return response.json()
}

/**
 * Write colors_xiv.json
 */
export async function writeColorsJson(dyes: Dye[]): Promise<WriteResult> {
  const response = await fetch(`${SERVER_BASE}/colors`, {
    method: 'POST',
    headers: getMutationHeaders(),
    body: JSON.stringify(dyes),
  })
  return response.json()
}

/**
 * Read a locale JSON file
 */
export async function readLocaleJson(locale: LocaleCode): Promise<LocaleData> {
  const response = await fetch(`${SERVER_BASE}/locale/${locale}`)
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
  const response = await fetch(`${SERVER_BASE}/locale/${locale}`, {
    method: 'POST',
    headers: getMutationHeaders(),
    body: JSON.stringify(data),
  })
  return response.json()
}

/**
 * Check if an item ID already exists
 */
export async function checkDuplicateItemId(itemId: number): Promise<boolean> {
  const response = await fetch(`${SERVER_BASE}/validate/${itemId}`)
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
  const response = await fetch(`${SERVER_BASE}/locales/labels`)
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
