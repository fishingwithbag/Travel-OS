import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const html = fs.readFileSync(`${root}index.html`, 'utf8');
const css = fs.readFileSync(`${root}src/styles.css`, 'utf8');
const originalUi = fs.readFileSync(`${root}src/original-ui.css`, 'utf8');
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

  it('keeps every runtime mount point required by the migrated interface', () => {
    for (const id of ['os-workspace','workspace','dashboard-now','next-stop-details','today-now','today-next','timeline','place-library','rental-list','stay-list','expense-list','summary-groups']) {
      expect(html).toContain(`id="${id}"`);
    }
    for (const className of ['rental-panel','os-topbar','today-workspace','bottom-nav']) {
      expect(html).toMatch(new RegExp(`class="[^"]*${className}`));
    }
    for (const view of ['dashboard','itinerary','places','more']) {
      expect(html).toContain(`data-view-panel="${view}"`);
    }
    expect(app).toContain("import './original-ui.css'");
    expect(originalUi).toContain('.today-workspace');
    expect(originalUi).toContain('.command-grid');
  });

  it('keeps note and parking labels compact and never renders notes as HTML', () => {
    expect(css).toContain('grid-template-columns:42px minmax(0,1fr)');
    expect(app).toContain('<strong>停車</strong>');
    expect(app).toContain('${escapeHtml(item.notes)}');
    expect(app).not.toContain('${item.notes}</span>');
  });

  it('matches the original places toolbar and collapsed management panels', () => {
    expect(html).toContain('id="region-tags" class="region-tags"');
    expect(html).toContain('class="add-section__header" data-new-place');
    expect(html).toContain('class="add-toggle-icon" aria-hidden="true">▼');
    expect(html).toContain('class="cards-sort" form="place-filters"');
    expect(html).toContain('<input name="favorites" type="checkbox" aria-label="只顯示收藏" hidden');
    expect(html).toContain('<details class="management-block">');
    expect(html).not.toContain('<details class="management-block" open>');
    for (const label of ['旅程與同行','費用與分攤','住宿預訂','租車與取還車','資料與備份']) {
      expect(html).toContain(label);
    }
    expect(originalUi).toContain('.management-block > summary');
    expect(originalUi).toContain('.places-view .region-tags:empty { display:none; }');
  });

  it('keeps the original itinerary tool order, daily stats and clear-day action', () => {
    const actions = html.match(/<div class="action-bar">([\s\S]*?)<\/div>/)?.[1] || '';
    expect(actions.indexOf('從景點總覽加入')).toBeLessThan(actions.indexOf('手動新增行程'));
    for (const label of ['加入航班','加入租車','清空這天']) expect(actions).toContain(label);
    expect(html).toContain('id="summary-hours"');
    expect(html).toContain('行程時數');
    expect(app).toContain("$('#clear-day-button').addEventListener('click'");
    expect(app).toContain("item.date!==state.selectedDate");
    expect(originalUi).toContain('grid-template-columns: repeat(3, minmax(0, 1fr))');
  });

  it('uses itinerary group controls for filtering and keeps editing in management', () => {
    expect(app).toContain("state.groupView=button.dataset.groupView");
    expect(app).toContain('itemsForGroup(dayItems,state.groupView)');
    expect(app).toContain('dashboardCurrent=dayItems[dashboardIndex]');
    expect(html).toContain('id="more-group-list"');
    expect(fs.readFileSync(`${root}src/ui/groups.js`, 'utf8')).toContain("document.querySelector('#more-group-list').addEventListener");
  });

  it('keeps local switching separate from destructive credential cleanup', () => {
    expect(html).toContain('id="local-mode-button"');
    expect(html).toContain('id="firebase-forget-button"');
    expect(app).toContain("state.mode === 'cloud' ? '切換到本機模式' : '先使用本機模式'");
    expect(app).toContain('Firebase 設定仍保留');
  });
});
