#!/usr/bin/env node
/**
 * Full-page screenshot utility
 * Usage: node scripts/screenshot.js <url> <output-path> [--width 1440]
 */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function screenshot(url, outputPath, width = 1440) {
  const absOutput = path.resolve(outputPath);
  fs.mkdirSync(path.dirname(absOutput), { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: parseInt(width), height: 900 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

  // Let lazy-loaded images settle
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(800);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(400);

  await page.screenshot({ path: absOutput, fullPage: true });
  await browser.close();

  console.log(absOutput);
}

const [,, url, outputPath, ...rest] = process.argv;
const widthFlag = rest.indexOf('--width');
const width = widthFlag !== -1 ? rest[widthFlag + 1] : 1440;

if (!url || !outputPath) {
  console.error('Usage: node scripts/screenshot.js <url> <output-path> [--width 1440]');
  process.exit(1);
}

screenshot(url, outputPath, width).catch(err => {
  console.error(err.message);
  process.exit(1);
});
