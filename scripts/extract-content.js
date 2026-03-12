#!/usr/bin/env node
/**
 * Extract structured content from a URL using Playwright (handles JS-rendered pages)
 * Usage: node scripts/extract-content.js <url> [output.json]
 * Prints JSON to stdout (or writes to file if path provided)
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function extract(url, outputPath) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

  const content = await page.evaluate(() => {
    const text = el => el ? (el.innerText || el.textContent || '').trim() : '';
    const attr = (el, a) => el ? (el.getAttribute(a) || '').trim() : '';

    // Title and meta
    const title = document.title;
    const description = attr(document.querySelector('meta[name="description"]'), 'content')
      || attr(document.querySelector('meta[property="og:description"]'), 'content');

    // Headings
    const headings = [...document.querySelectorAll('h1, h2, h3, h4')]
      .map(el => ({ tag: el.tagName.toLowerCase(), text: text(el) }))
      .filter(h => h.text.length > 2 && h.text.length < 300);

    // Paragraphs (filter out nav/footer/tiny snippets)
    const paragraphs = [...document.querySelectorAll('p')]
      .filter(el => {
        const t = text(el);
        if (t.length < 40) return false;
        const ancestor = el.closest('nav, footer, header, script, style');
        return !ancestor;
      })
      .map(el => text(el))
      .filter((t, i, arr) => arr.indexOf(t) === i) // deduplicate
      .slice(0, 30);

    // CTA / buttons
    const ctaText = [...document.querySelectorAll('a[class*="btn"], a[class*="button"], button, [role="button"]')]
      .map(el => text(el))
      .filter(t => t.length > 1 && t.length < 60)
      .filter((t, i, arr) => arr.indexOf(t) === i)
      .slice(0, 10);

    // Navigation
    const navItems = [...document.querySelectorAll('nav a')]
      .map(el => ({ label: text(el), href: attr(el, 'href') }))
      .filter(n => n.label.length > 0 && n.label.length < 50)
      .slice(0, 20);

    // Images (src + alt for reference, not copying)
    const images = [...document.querySelectorAll('img')]
      .map(el => ({ src: attr(el, 'src'), alt: attr(el, 'alt') }))
      .filter(img => img.alt.length > 0)
      .slice(0, 20);

    // JSON-LD structured data
    let structuredData = null;
    const jsonLd = document.querySelector('script[type="application/ld+json"]');
    if (jsonLd) {
      try { structuredData = JSON.parse(jsonLd.textContent); } catch {}
    }

    return { url: location.href, title, description, headings, paragraphs, ctaText, navItems, images, structuredData };
  });

  await browser.close();

  const json = JSON.stringify(content, null, 2);

  if (outputPath) {
    fs.mkdirSync(path.dirname(path.resolve(outputPath)), { recursive: true });
    fs.writeFileSync(path.resolve(outputPath), json);
    console.error(`Saved to ${outputPath}`);
  }

  console.log(json);
}

const [,, url, outputPath] = process.argv;
if (!url) { console.error('Usage: node scripts/extract-content.js <url> [output.json]'); process.exit(1); }

extract(url, outputPath).catch(err => { console.error(err.message); process.exit(1); });
