/// <reference lib="dom" />
/// <reference lib="dom.iterable" />
import { devices, expect, test, type Page } from '@playwright/test';

// iPhone 13 (390 × 664 CSS px, touch, mobile user agent) in Chromium.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const { defaultBrowserType, ...iphone13 } = devices['iPhone 13'];
test.use(iphone13);

async function noHorizontalScroll(page: Page, name: string) {
  await page.waitForTimeout(400);
  const r = await page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const wide = [...document.querySelectorAll<HTMLElement>('body *')]
      .filter((el) => {
        const b = el.getBoundingClientRect();
        // Elements inside a horizontal scroller (sub-nav, tables) or the map are allowed to extend.
        return b.width > 0 && b.right > vw + 1 && !el.closest('.overflow-x-auto, .leaflet-container, .maplibregl-map');
      })
      .slice(0, 5)
      .map((el) => `${el.tagName.toLowerCase()}.${String(el.className).slice(0, 60)} → ${Math.round(el.getBoundingClientRect().right)}px`);
    return { vw, sw: document.documentElement.scrollWidth, wide };
  });
  expect(r.vw, name).toBe(390);
  expect({ page: name, scrollWidth: r.sw, wide: r.wide }).toEqual({ page: name, scrollWidth: 390, wide: [] });
}

test('no horizontal scroll at 390 px on the demo screens', async ({ page }) => {
  await page.goto('./');
  await page.getByTestId('start-demo').click();

  await expect(page.getByTestId('brief-summary')).toBeVisible();
  await page.getByTestId('brief-sample').click();
  await page.getByTestId('brief-read').click();
  await expect(page.getByTestId('brief-reading')).toBeVisible({ timeout: 200_000 });
  await noHorizontalScroll(page, 'BriefPage');

  await page.getByTestId('demo-next').click();
  await expect(page.getByTestId('review-queue')).toBeVisible();
  await page.getByTestId('demo-next').click();
  await expect(page.getByTestId('plan-kpis')).toBeVisible();
  await expect(page.getByTestId('map3d')).toBeVisible();
  await noHorizontalScroll(page, 'PlanPage (map)');

  await page.getByTestId('demo-next').click();
  await expect(page.getByTestId('realloc-diff')).toBeVisible();
  await noHorizontalScroll(page, 'ChangePage');

  await page.getByTestId('demo-next').click();
  await expect(page.getByTestId('invoice-total')).toBeVisible();
  await noHorizontalScroll(page, 'InvoicePage');

  await page.getByTestId('demo-next').click();
  await expect(page.getByTestId('mission-summary')).toBeVisible();
  await noHorizontalScroll(page, 'SummaryPage');

  await page.goto('#/employee');
  await expect(page.getByTestId('chat')).toBeVisible();
  await noHorizontalScroll(page, 'EmployeePage');

  await page.goto('#/share');
  await expect(page.getByTestId('share-qr')).toBeVisible();
  await noHorizontalScroll(page, 'SharePage');
});

test('no horizontal scroll at 390 px in live mode', async ({ page }) => {
  await page.goto('./');
  await noHorizontalScroll(page, 'Home');
  await page.getByTestId('start-live').click();
  await page.getByTestId('live-company').fill('Acme Data Centres');
  await noHorizontalScroll(page, 'Live brief');
  await page.getByTestId('generate-plan').click();
  await expect(page.getByTestId('plan-options')).toBeVisible();
  await noHorizontalScroll(page, 'Live options');
  await page.getByTestId('release-plan').click();
  await expect(page.getByTestId('listing-card').first()).toBeVisible();
  await noHorizontalScroll(page, 'Live plan');
});
