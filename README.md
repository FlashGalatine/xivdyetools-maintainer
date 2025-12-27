# XIV Dye Tools - Dye Maintainer

A developer tool for adding new dyes to the `xivdyetools-core` library.

## Features

- **Auto Color Conversion**: Enter a HEX color and RGB/HSV values are calculated automatically
- **XIVAPI Integration**: Fetch localized names (EN, JA, DE, FR) automatically from XIVAPI
- **Direct File Writing**: Updates `colors_xiv.json` and all 6 locale files directly
- **Live Preview**: See the exact JSON entry before saving
- **Validation**: Real-time validation with duplicate ID detection

## Prerequisites

- Node.js 18+
- The `xivdyetools-core` library must be in a sibling directory

## Setup

```bash
# Navigate to the maintainer directory
cd xivdyetools-maintainer

# Install dependencies
npm install

# Start the development server (runs both frontend and backend)
npm run dev
```

This will start:
- **Frontend**: http://localhost:5174 (Vite dev server)
- **Backend**: http://localhost:3001 (Express file server)

## Usage

1. **Enter Item ID**: Get the Item ID from [Universalis](https://universalis.app) or [XIVAPI](https://v2.xivapi.com)

2. **Fetch from XIVAPI**: Click the button to auto-populate English, Japanese, German, and French names

3. **Enter HEX Color**: Use the color picker or type manually. RGB and HSV are calculated automatically

4. **Fill Details**:
   - Select the category (Neutral, Reds, Blues, etc.)
   - Select acquisition method (Dye Vendor, Crafting, etc.)
   - Set price and currency if applicable
   - Check variant flags (Metallic, Pastel, Dark, Cosmic)

5. **Manual Locale Entry**: Enter Korean and Chinese names manually (XIVAPI doesn't support these)

6. **Review Preview**: Check the JSON preview to ensure everything is correct

7. **Add to Library**: Click "Add Dye to Library" to write to the core library files

## Files Modified

When you add a dye, the tool updates:

- `xivdyetools-core/src/data/colors_xiv.json` - Main dye database
- `xivdyetools-core/src/data/locales/en.json` - English locale
- `xivdyetools-core/src/data/locales/ja.json` - Japanese locale
- `xivdyetools-core/src/data/locales/de.json` - German locale
- `xivdyetools-core/src/data/locales/fr.json` - French locale
- `xivdyetools-core/src/data/locales/ko.json` - Korean locale
- `xivdyetools-core/src/data/locales/zh.json` - Chinese locale

## After Adding Dyes

After adding new dyes, you should:

1. Run tests in the core library:
   ```bash
   cd ../xivdyetools-core
   npm test
   ```

2. Build and publish if tests pass:
   ```bash
   npm run build
   npm version patch
   npm publish
   ```

3. Update consumer projects:
   ```bash
   cd ../xivdyetools-web-app
   npm update @xivdyetools/core
   ```

## Tech Stack

- **Frontend**: Vue 3 + TypeScript + Vite + Tailwind CSS v4
- **Backend**: Express.js (for file operations)
- **Core**: Uses `@xivdyetools/core` for color conversion

## Project Structure

```
xivdyetools-maintainer/
├── src/
│   ├── components/       # Vue components
│   │   ├── DyeForm.vue         # Main form orchestrator
│   │   ├── ColorInput.vue      # HEX input + RGB/HSV display
│   │   ├── CategorySelect.vue  # Category dropdown
│   │   ├── AcquisitionInput.vue
│   │   ├── FlagsInput.vue
│   │   ├── LocaleInputs.vue
│   │   ├── ItemIdFetcher.vue
│   │   ├── PreviewCard.vue
│   │   └── ValidationMessages.vue
│   ├── services/         # Business logic
│   │   ├── colorService.ts     # Color conversion (wraps core)
│   │   ├── xivapiService.ts    # XIVAPI integration
│   │   └── fileService.ts      # Express API client
│   ├── types/            # TypeScript definitions
│   └── utils/            # Constants and helpers
└── server/
    └── api.ts            # Express server for file I/O
```

## Troubleshooting

### "Backend server not running" error
Make sure to start the app with `npm run dev` which runs both the frontend and backend concurrently.

### XIVAPI fetch fails
- Check your internet connection
- Verify the Item ID is correct
- XIVAPI may be temporarily unavailable

### Changes not appearing
After adding a dye, you need to rebuild the core library (`npm run build` in xivdyetools-core) for changes to take effect in consumer projects.

## Connect With Me

**Flash Galatine** | Balmung (Crystal)

🎮 **FFXIV**: [Lodestone Character](https://na.finalfantasyxiv.com/lodestone/character/7677106/)
📝 **Blog**: [Project Galatine](https://blog.projectgalatine.com/)
💻 **GitHub**: [@FlashGalatine](https://github.com/FlashGalatine)
🐦 **X / Twitter**: [@AsheJunius](https://x.com/AsheJunius)
📺 **Twitch**: [flashgalatine](https://www.twitch.tv/flashgalatine)
🌐 **BlueSky**: [projectgalatine.com](https://bsky.app/profile/projectgalatine.com)
❤️ **Patreon**: [ProjectGalatine](https://patreon.com/ProjectGalatine)
☕ **Ko-Fi**: [flashgalatine](https://ko-fi.com/flashgalatine)
💬 **Discord**: [Join Server](https://discord.gg/5VUSKTZCe5)

## License

MIT © 2025 Flash Galatine
