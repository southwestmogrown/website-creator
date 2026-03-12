# website-creator

> Clone any website's design, fill it with your content, and ship a polished HTML file — all from inside Claude Code.

No separate app to install or configure. Claude Code drives every step: taking full-page screenshots, extracting structured content from JS-rendered pages, generating a self-contained HTML file, and hot-reloading a live preview as you iterate.

---

## Features

- **One-command screenshots** — capture any URL as a full-page PNG at any viewport width
- **JS-aware content extraction** — scrape headings, paragraphs, CTAs, nav, and structured data from any modern site
- **Live-reload dev server** — serves your generated HTML with WebSocket hot-reload; the browser updates within ~100ms of every save
- **Single self-contained output** — all CSS inlined in `<style>` tags, no external CDN links, one portable `.html` file

---

## Tech Stack

| Layer | Technology |
|---|---|
| Screenshots & scraping | [Playwright](https://playwright.dev/) (Chromium, headless) |
| Live-reload server | Node.js `http` + [ws](https://github.com/websockets/ws) |
| File watching | [chokidar](https://github.com/paulmillr/chokidar) |
| Runtime | Node.js 20+ |

---

## Getting Started

### Prerequisites

- Node.js 20+
- Claude Code (drives the generation workflow)

### Installation

```bash
# Clone the repo
git clone https://github.com/southwestmogrown/website-creator
cd website-creator

# Install dependencies
npm install

# Install the Playwright browser (one-time)
npx playwright install chromium
```

---

## Usage

### The Workflow

**1. Screenshot the design reference site**
```bash
node scripts/screenshot.js <target-url> ./output/target-full.png
```

**2. Screenshot the content source site**
```bash
node scripts/screenshot.js <source-url> ./output/source-full.png
```

**3. Extract structured content from the source**
```bash
node scripts/extract-content.js <source-url> ./output/content.json
```

**4. Generate the site via Claude Code**

Inside Claude Code, provide:
- `./output/target-full.png` — visual reference for layout, color, and typography
- `./output/content.json` — the actual text and structure to populate

Ask Claude to produce a single self-contained `./output/generated/index.html`.

**5. Start the live preview**
```bash
node scripts/serve.js ./output/generated 3000
```

Open `http://localhost:3000`. Every time `index.html` is overwritten, the browser reloads automatically.

**6. Iterate**

Ask Claude to refine the design. It overwrites `index.html`; the browser updates instantly.

### Script Reference

```bash
# Full-page screenshot (default width: 1440px)
node scripts/screenshot.js <url> <output-path> [--width 1440]

# Extract structured content from any URL (handles JS-rendered pages)
node scripts/extract-content.js <url> [output.json]

# Serve a directory with live-reload (default port: 3000)
node scripts/serve.js <directory> [port]
```

### npm Shortcuts

```bash
npm run screenshot -- <url> <output-path>
npm run extract -- <url> [output.json]
npm run serve -- <directory> [port]
```

---

## Output Directory Structure

```
output/
  target-full.png          # screenshot of the design reference
  source-full.png          # screenshot of the content source
  content.json             # structured content extracted from source
  generated/
    index.html             # current working output (served live)
    index-v1.html          # version snapshots saved before each overwrite
    index-v2.html
    ...
  generated-v1.png         # screenshots after each generation/refinement
  generated-v2.png
  ...
```

---

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you'd like to change.

---

## License

ISC
