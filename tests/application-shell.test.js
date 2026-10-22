import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const html = fs.readFileSync(`${root}index.html`, 'utf8');
const css = fs.readFileSync(`${root}src/styles.css`, 'utf8');
const app = fs.readFileSync(`${root}src/app.js`, 'utf8');

describe('original Travel OS application shell', () => {
  it('keeps the four original navigation destinations and responsive desktop rail', () => {
    for (const view of ['dashboard','itinerary','places','more']) {
      expect(html).toContain(`data-view-target="${view}"`);
    }
    expect(css).toContain('width:calc(100% - 92px)');
    expect(css).toContain('width:92px');
    expect(app).toContain("new Set(['dashboard','itinerary','places','more'])");
  });

  it('keeps note and parking labels compact and never renders notes as HTML', () => {
    expect(css).toContain('grid-template-columns:42px minmax(0,1fr)');
    expect(app).toContain('<strong>停車</strong>');
    expect(app).toContain('${escapeHtml(item.notes)}');
    expect(app).not.toContain('${item.notes}</span>');
  });
});
