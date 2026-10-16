import { expect, test, type Page } from '@playwright/test';

async function openDemo(page: Page) {
  await page.goto('#/demo');
  await expect(page.getByTestId('demo-steps')).toBeVisible();
}

test('investor demo: 5 steps end to end', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));

  await test.step('1 · Allocate 15 employees → plan in < 2 s with map and KPIs', async () => {
    await openDemo(page);
    const t0 = Date.now();
    await page.getByTestId('demo-step-1').click();
    await expect(page.getByTestId('plan-kpis')).toContainText('€27,000');
    const elapsed = Date.now() - t0;
    expect(elapsed).toBeLessThan(2000);
    await expect(page.getByTestId('plan-map').locator('.leaflet-container')).toBeVisible();
    expect(await page.locator('.leaflet-interactive').count()).toBeGreaterThan(15);
    const engineMs = parseFloat((await page.getByTestId('computed-ms').innerText()).replace(/[^\d.]/g, ''));
    expect(engineMs).toBeLessThan(2000);
    await expect(page.getByTestId('plan-table').locator('tbody tr')).toHaveCount(15);
    await expect(page.getByTestId('tradeoffs').locator('li').first()).toBeVisible();
  });

  await test.step('2 · Extend 2 months + 3 engineers → re-allocation diff', async () => {
    await openDemo(page);
    await page.getByTestId('demo-step-2').click();
    const diff = page.getByTestId('realloc-diff');
    await expect(diff).toBeVisible();
    await expect(diff.locator('tbody tr')).toHaveCount(18);
    await expect(diff.locator('tbody tr', { hasText: 'Moved' })).toHaveCount(3);
    await expect(diff.locator('tbody tr', { hasText: 'New team member' })).toHaveCount(3);
  });

  await test.step('3 · Verification catches a fraudulent listing', async () => {
    await openDemo(page);
    await page.getByTestId('demo-step-3').click();
    await expect(page.getByTestId('trust-score')).toContainText('15');
    await expect(page.getByTestId('trust-score')).toContainText('Reject');
    await expect(page.getByText(/Same photos found on U23/)).toBeVisible();
    await expect(page.getByTestId('queue-U60')).toContainText('Reject');
  });

  await test.step('4 · Compliance blocks a non-compliant lease', async () => {
    await openDemo(page);
    await page.getByTestId('demo-step-4').click();
    await expect(page.getByTestId('sign-lease')).toBeDisabled();
    await expect(page.getByTestId('sign-blocked')).toContainText('Signing blocked');
  });

  await test.step('5 · One invoice: GMV vs our revenue', async () => {
    await openDemo(page);
    await page.getByTestId('demo-step-5').click();
    await expect(page.getByTestId('gmv')).toHaveText('€174,960');
    await expect(page.getByTestId('revenue')).toHaveText('€29,160');
  });

  expect(errors).toEqual([]);
});

test('each demo step works on its own (fresh browser, step 5 first)', async ({ page }) => {
  await openDemo(page);
  await page.getByTestId('demo-step-5').click();
  await expect(page.getByTestId('gmv')).toHaveText('€174,960');
  await openDemo(page);
  await page.getByTestId('demo-step-4').click();
  await expect(page.getByTestId('sign-lease')).toBeDisabled();
});

test('client invoice shows rent, 8% fee and VAT on the fee', async ({ page }) => {
  await openDemo(page);
  await page.getByTestId('demo-step-1').click();
  await page.goto('#/client/invoice');
  const totals = page.getByTestId('invoice-totals');
  await expect(totals).toContainText('€27,000.00');
  await expect(totals).toContainText('€2,160.00');
  await expect(totals).toContainText('€453.60');
  await expect(totals).toContainText('€29,613.60');
});

test('employee issue report is triaged as urgent with a 2 h SLA', async ({ page }) => {
  await openDemo(page);
  await page.getByTestId('demo-step-1').click();
  await page.goto('#/employee');
  await page.getByRole('button', { name: 'Report' }).click();
  await page.getByLabel("What's wrong?").fill('There is a smell of gas in the kitchen');
  await page.getByTestId('report-issue').click();
  await expect(page.getByTestId('triage-result')).toContainText('URGENT');
  await expect(page.getByTestId('triage-result')).toContainText('SLA 2 h');
});
