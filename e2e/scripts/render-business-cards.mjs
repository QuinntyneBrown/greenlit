// Renders docs/assets/print/business-card.html to VistaPrint-ready PNGs.
// Lives in e2e/ so it can use its Playwright. Run from e2e/:  node scripts/render-business-cards.mjs
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { execFileSync } from 'node:child_process';

const dir = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'docs', 'assets', 'print');
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1125, height: 675 }, deviceScaleFactor: 1 });
await page.goto('file://' + join(dir, 'business-card.html'));
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(500);
for (const side of ['front', 'back']) {
  await page.evaluate((s) => {
    document.getElementById('front').style.display = s === 'front' ? '' : 'none';
    document.getElementById('back').style.display = s === 'back' ? '' : 'none';
  }, side);
  const out = join(dir, `business-card-${side}.png`);
  await page.screenshot({ path: out });
  try { execFileSync('sips', ['-s', 'dpiWidth', '300', '-s', 'dpiHeight', '300', out], { stdio: 'ignore' }); } catch {}
}
await browser.close();
