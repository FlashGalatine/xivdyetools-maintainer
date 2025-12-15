/**
 * Express server for file operations
 * Handles reading/writing to xivdyetools-core data files
 *
 * SECURITY: This is a development-only tool. Do NOT deploy to production.
 */

import express, { Request, Response, NextFunction } from 'express'
import cors from 'cors'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

// ============================================================================
// SECURITY: Production Environment Guard
// ============================================================================
if (process.env.NODE_ENV === 'production') {
  console.error('╔══════════════════════════════════════════════════════════════╗')
  console.error('║  ERROR: Maintainer service must NOT run in production!       ║')
  console.error('║  This tool is for local development only.                    ║')
  console.error('╚══════════════════════════════════════════════════════════════╝')
  process.exit(1)
}

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
app.use(cors())
app.use(express.json({ limit: '10mb' }))

// ============================================================================
// SECURITY: API Key Authentication Middleware
// ============================================================================
const API_KEY = process.env.MAINTAINER_API_KEY

/**
 * Middleware to require API key for mutation (POST/PUT/DELETE) requests
 */
function requireApiKey(req: Request, res: Response, next: NextFunction): void {
  // Skip authentication for GET requests (read-only)
  if (req.method === 'GET') {
    next()
    return
  }

  // Require API key for mutations
  if (!API_KEY) {
    console.warn('⚠️  WARNING: MAINTAINER_API_KEY not set. Write operations disabled.')
    res.status(503).json({
      success: false,
      error: 'Service not configured. Set MAINTAINER_API_KEY environment variable.',
    })
    return
  }

  const providedKey = req.headers['x-api-key']
  if (providedKey !== API_KEY) {
    console.warn(`🚫 Unauthorized API request to ${req.method} ${req.path}`)
    res.status(401).json({ success: false, error: 'Unauthorized' })
    return
  }

  next()
}

// Apply API key middleware to all /api routes
app.use('/api', requireApiKey)

// Path to xivdyetools-core (sibling directory)
const CORE_PATH = path.resolve(__dirname, '../../xivdyetools-core')
const COLORS_PATH = path.join(CORE_PATH, 'src/data/colors_xiv.json')
const LOCALES_PATH = path.join(CORE_PATH, 'src/data/locales')

const PORT = 3001

// Utility to read JSON file
async function readJsonFile<T>(filePath: string): Promise<T> {
  const data = await fs.readFile(filePath, 'utf-8')
  return JSON.parse(data) as T
}

// Utility to write JSON file with consistent formatting
async function writeJsonFile(filePath: string, data: unknown): Promise<void> {
  const formatted = JSON.stringify(data, null, 2)
  await fs.writeFile(filePath, formatted + '\n', 'utf-8')
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', corePath: CORE_PATH })
})

// GET /api/colors - Read colors_xiv.json
app.get('/api/colors', async (req, res) => {
  try {
    const data = await readJsonFile(COLORS_PATH)
    res.json(data)
  } catch (error) {
    console.error('Error reading colors file:', error)
    res.status(500).json({ success: false, error: 'Failed to read colors file' })
  }
})

// POST /api/colors - Write colors_xiv.json
app.post('/api/colors', async (req, res) => {
  try {
    await writeJsonFile(COLORS_PATH, req.body)
    res.json({ success: true })
  } catch (error) {
    console.error('Error writing colors file:', error)
    res.status(500).json({ success: false, error: 'Failed to write colors file' })
  }
})

// GET /api/locale/:code - Read locale JSON file
app.get('/api/locale/:code', async (req, res) => {
  const { code } = req.params
  const validCodes = ['en', 'ja', 'de', 'fr', 'ko', 'zh']

  if (!validCodes.includes(code)) {
    return res.status(400).json({ success: false, error: 'Invalid locale code' })
  }

  try {
    const filePath = path.join(LOCALES_PATH, `${code}.json`)
    const data = await readJsonFile(filePath)
    res.json(data)
  } catch (error) {
    console.error(`Error reading locale file ${code}:`, error)
    res.status(500).json({ success: false, error: `Failed to read locale file: ${code}` })
  }
})

// POST /api/locale/:code - Write locale JSON file
app.post('/api/locale/:code', async (req, res) => {
  const { code } = req.params
  const validCodes = ['en', 'ja', 'de', 'fr', 'ko', 'zh']

  if (!validCodes.includes(code)) {
    return res.status(400).json({ success: false, error: 'Invalid locale code' })
  }

  try {
    const filePath = path.join(LOCALES_PATH, `${code}.json`)
    await writeJsonFile(filePath, req.body)
    res.json({ success: true })
  } catch (error) {
    console.error(`Error writing locale file ${code}:`, error)
    res.status(500).json({ success: false, error: `Failed to write locale file: ${code}` })
  }
})

// GET /api/validate/:itemId - Check if itemID already exists
app.get('/api/validate/:itemId', async (req, res) => {
  try {
    const itemId = parseInt(req.params.itemId, 10)
    if (isNaN(itemId)) {
      return res.status(400).json({ success: false, error: 'Invalid item ID' })
    }

    const dyes = await readJsonFile<Array<{ itemID: number | null }>>(COLORS_PATH)
    const exists = dyes.some((dye) => dye.itemID === itemId)
    res.json({ exists })
  } catch (error) {
    console.error('Error validating item ID:', error)
    res.status(500).json({ success: false, error: 'Failed to validate item ID' })
  }
})

// GET /api/locales/labels - Get all locale labels (for prefix stripping)
app.get('/api/locales/labels', async (req, res) => {
  try {
    const labels: Record<string, string> = {}
    const codes = ['en', 'ja', 'de', 'fr', 'ko', 'zh']

    for (const code of codes) {
      const filePath = path.join(LOCALES_PATH, `${code}.json`)
      const data = await readJsonFile<{ labels: { dye: string } }>(filePath)
      labels[code] = data.labels.dye
    }

    res.json(labels)
  } catch (error) {
    console.error('Error reading locale labels:', error)
    res.status(500).json({ success: false, error: 'Failed to read locale labels' })
  }
})

app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════╗
║  XIV Dye Tools - Maintainer API Server               ║
╠══════════════════════════════════════════════════════╣
║  Server running at: http://localhost:${PORT}            ║
║  Core path: ${CORE_PATH.slice(-40).padStart(40)}  ║
╚══════════════════════════════════════════════════════╝
  `)
})
