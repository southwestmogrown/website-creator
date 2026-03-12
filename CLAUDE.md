# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Project Does

This is a **Claude Code-native workflow** — no separate application to run. Claude Code itself drives every step: taking screenshots, scraping content, generating website HTML, serving a live preview, and iterating on refinements through conversation.

## Setup

```bash
npm install
npx playwright install chromium   # one-time, installs the browser binary
```

## Available Scripts

```bash
# Full-page screenshot of any URL → saves PNG, prints path
node scripts/screenshot.js <url> <output-path> [--width 1440]

# Scrape structured content from any URL (handles JS-rendered pages)
node scripts/extract-content.js <url> [output.json]

# Serve a directory with live-reload (WebSocket-based, auto-reloads on file change)
node scripts/serve.js <directory> [port]          # default port: 3000
```

## The Workflow

### Starting a New Build

When the user provides a **target URL** (design to replicate) and **source URL** (content to use):

**Step 1 — Screenshot the target site**
```bash
node scripts/screenshot.js <target-url> ./output/target-full.png
```

**Step 2 — Screenshot the source site**
```bash
node scripts/screenshot.js <source-url> ./output/source-full.png
```

**Step 3 — Extract content from the source site**
```bash
node scripts/extract-content.js <source-url> ./output/content.json
```

**Step 4 — Generate the website**

Use the `frontend-design` skill. Provide it:
- The target screenshot (`./output/target-full.png`) — as a visual reference for layout, color, typography
- The extracted content JSON — as the actual text/structure to populate
- Instruction to produce a **single self-contained HTML file** with all CSS inlined (no external CDN dependencies)

Write the output to `./output/generated/index.html`.

**Step 5 — Start the live preview server**
```bash
node scripts/serve.js ./output/generated 3000
```
This runs in the background. The user can open `http://localhost:3000` to preview.

**Step 6 — Screenshot the generated output**
```bash
node scripts/screenshot.js http://localhost:3000 ./output/generated-v1.png
```
Show this screenshot to the user so they can see the result without leaving the terminal.

### Iterative Refinement

Each time the user issues a refinement prompt:

1. Take a fresh screenshot of the current output:
   ```bash
   node scripts/screenshot.js http://localhost:3000 ./output/generated-v{n}.png
   ```
2. Pass the screenshot + the user's prompt to the `frontend-design` skill with the existing HTML as context.
3. Overwrite `./output/generated/index.html` with the updated HTML.
4. The live-reload server automatically pushes the change to the browser.
5. Take a new screenshot and show it to the user.
6. Save the previous version as `./output/generated-v{n-1}.html` before overwriting (for undo).

Special user commands during refinement:
- **`undo`** — restore the previous versioned HTML file
- **`screenshot`** — take and show a screenshot without generating new HTML
- **`done`** — stop the session, print a summary

## Output Directory Structure

```
output/
  target-full.png          # screenshot of the design reference site
  source-full.png          # screenshot of the content source site
  content.json             # structured content extracted from source
  generated/
    index.html             # current working output (served live)
    index-v1.html          # version snapshots (before each overwrite)
    index-v2.html
    ...
  generated-v1.png         # screenshots after each generation/refinement
  generated-v2.png
  ...
```

## Key Principles

- **Single self-contained HTML file**: All CSS must be inlined in `<style>` tags. No external CDN links. This makes the output portable and sharable as one file.
- **Real content only**: No placeholder text. Every element must use content from `content.json`.
- **Full-page screenshots**: Always use `fullPage: true` (the script handles this). Never screenshot just the viewport.
- **Preserve what's working**: On refinement, attach the current screenshot alongside the prompt so the model can make surgical edits rather than regenerating from scratch.
- **Atomic file writes**: Write the complete HTML file in one operation to avoid the browser reloading a partial/broken document.

## Serving Notes

The `serve.js` script injects a WebSocket live-reload snippet before `</body>`. When `index.html` is overwritten, all connected browsers reload automatically within ~100ms. Run it as a background process:
```bash
node scripts/serve.js ./output/generated 3000 &
```
Kill it with `kill %1` or `pkill -f serve.js` when done.
