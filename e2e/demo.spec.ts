import { expect, test, type Page } from '@playwright/test';

// Numbers below come from SETTLE_IN_FACTS.md (business plan v11).
async function home(page: Page) {
  await page.goto('./');
  await expect(page.getByTestId('start-demo')).toBeVisible();
}

test('guided demo: Brief → Plan → Approve → Re-plan → Invoice → Summary in under 3 minutes', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const t0 = Date.now();

  await home(page);
  await page.getByTestId('start-demo').click();

  await test.step('1 · Brief', async () => {
    await expect(page.getByTestId('brief-summary')).toContainText('20 engineers');
    await expect(page.getByTestId('demo-bar')).toBeVisible();
    await page.getByTestId('generate-plan').click();
  });

  await test.step('2 · Plan — Ops review with options A/B/C', async () => {
    await expect(page.getByTestId('review-queue')).toBeVisible();
    await expect(page.getByTestId('option-A')).toContainText('€1,935');
    await expect(page.getByTestId('option-A')).toContainText('31 min');
    await expect(page.getByTestId('option-B')).toContainText('€1,992');
    await expect(page.getByTestId('option-B')).toContainText('22 min');
    await expect(page.getByTestId('option-C')).toContainText('€2,140');
    await expect(page.getByTestId('option-C')).toContainText('12 min');
    await page.getByTestId('release-plan').click();
  });

  await test.step('3 · Approve', async () => {
    await expect(page.getByTestId('plan-kpis')).toContainText('20 / 20');
    await expect(page.getByTestId('kpi-pay')).toContainText('€239,034');
    await expect(page.getByTestId('map3d')).toBeVisible();
    await page.getByTestId('approve-plan').click();
    await page.getByTestId('demo-next').click();
  });

  await test.step('4 · Re-plan — the team drops to 15 from month 4', async () => {
    const diff = page.getByTestId('realloc-diff');
    await expect(diff).toBeVisible();
    await expect(page.getByTestId('kpi-moved')).toContainText('0');
    await expect(page.getByTestId('kpi-replan-cost')).toContainText('−€29,880');
    await expect(page.getByTestId('kpi-replan-cost')).toContainText('5 × €1,992 × 3 months');
    await expect(diff).toContainText('15');
    await expect(diff).toContainText('4%');
    await expect(page.getByTestId('without-flex')).toContainText('€9,960');
    await page.getByTestId('demo-next').click();
  });

  await test.step('5 · Invoice', async () => {
    await expect(page.getByTestId('invoice-total')).toHaveText('€239,034');
    await expect(page.getByTestId('line-markup')).toContainText('4%');
    await expect(page.getByTestId('line-flex')).toContainText('2%');
    await page.getByTestId('demo-next').click();
  });

  await test.step('6 · Mission summary', async () => {
    await expect(page.getByTestId('summary-revenue')).toContainText('€24,805');
    await expect(page.getByTestId('summary-ops')).toContainText('39 h');
    await expect(page.getByTestId('summary-ops')).toContainText('182 h');
    await expect(page.getByTestId('summary-invoices')).toContainText('1');
    await page.getByTestId('demo-finish').click();
    await expect(page.getByTestId('start-demo')).toBeVisible();
  });

  expect(Date.now() - t0).toBeLessThan(180_000);
  expect(errors).toEqual([]);
});

test('Ops console: fraud caught, lease blocked, ledger keeps the Flex pool out of revenue', async ({ page }) => {
  await home(page);
  await page.getByTestId('link-fraud').click();
  await expect(page.getByTestId('trust-score')).toContainText('Reject');
  await expect(page.getByText(/Same photos found on MAD27/)).toBeVisible();

  await home(page);
  await page.getByTestId('link-lease').click();
  await page.getByRole('button', { name: 'Generate demo plan' }).click();
  await expect(page.getByTestId('sign-lease')).toBeDisabled();
  await expect(page.getByTestId('sign-blocked')).toContainText('Signing blocked');

  await home(page);
  await page.getByTestId('link-ledger').click();
  await expect(page.getByTestId('ledger-company')).toContainText('€239,034');
  await expect(page.getByTestId('ledger-revenue')).toContainText('€24,805');
  await expect(page.getByTestId('ledger-flexpool')).toContainText('€2,255');
  await expect(page.getByTestId('ledger-flexpool')).toContainText('Not revenue');
});

test('employee WhatsApp chat triages an urgent issue with a 2 h SLA', async ({ page }) => {
  await home(page);
  await page.getByTestId('start-demo').click();
  await page.getByTestId('demo-next').click(); // plan exists
  await page.getByTestId('demo-next').click(); // released
  await page.goto('#/employee');
  await expect(page.getByTestId('chat')).toContainText('Welcome to Settle In');
  await page.getByLabel('Message').fill('There is a smell of gas in the kitchen');
  await page.getByTestId('report-issue').click();
  await expect(page.getByTestId('triage-result')).toContainText('URGENT');
  await expect(page.getByTestId('triage-result')).toContainText('SLA 2 h');
});

test('brief reader fills the brief from a pasted request (language model, or rule parser when offline)', async ({ page }) => {
  test.setTimeout(240_000);
  await home(page);
  await page.getByTestId('start-demo').click();
  await page.getByTestId('brief-sample').click();
  await page.getByTestId('brief-read').click();
  const reading = page.getByTestId('brief-reading');
  await expect(reading).toBeVisible({ timeout: 200_000 });
  await expect(reading).toContainText('6 months');
  await expect(reading).toContainText('€2,200/mo');
  await expect(page.getByTestId('brief-summary')).toContainText('20 engineers');
});

test('start over clears the demo; share page shows a QR code and the short address', async ({ page }) => {
  await home(page);
  await page.getByTestId('start-demo').click();
  await page.getByTestId('demo-next').click();
  await expect(page.getByTestId('review-queue')).toBeVisible();
  await page.getByTestId('reset-demo').click();
  await expect(page.getByTestId('start-demo')).toBeVisible();
  await page.goto('#/ops/review');
  await expect(page.getByText('No plans waiting for review')).toBeVisible();

  await page.getByTestId('share-link').click();
  await expect(page.getByTestId('share-qr')).toBeVisible();
  await expect(page.getByTestId('share-url')).not.toContainText('http');
});

test('brief reader: a request that leaves things out shows them as missing and blocks the plan until filled', async ({ page }) => {
  test.setTimeout(240_000);
  await home(page);
  await page.getByTestId('start-demo').click();
  await page.getByTestId('brief-request').fill('Lisbon project, 20 engineers, 6 months.');
  await page.getByTestId('brief-read').click();
  await expect(page.getByTestId('brief-reading')).toBeVisible({ timeout: 200_000 });
  await expect(page.locator('[data-source="missing"]').first()).toBeVisible();
  await expect(page.getByTestId('brief-summary')).toContainText('Missing — please fill');
  await expect(page.getByTestId('generate-plan')).toBeDisabled();
  await page.getByTestId('brief-edit').getByRole('radio', { name: /Madrid/ }).click();
  await page.getByTestId('edit-start').fill('2027-01-11');
  await page.getByTestId('edit-commute').fill('30');
  await page.getByTestId('edit-budget').fill('2100');
  await expect(page.getByTestId('generate-plan')).toBeEnabled();
});

test('live mode: your own mission in Madrid on real public listings', async ({ page }) => {
  await home(page);
  await expect(page.getByTestId('coming-next')).toContainText('Valencia');
  await expect(page.getByTestId('coming-next')).toContainText('Year 2');
  await expect(page.getByTestId('coming-next').getByRole('link', { name: 'Tell me when it opens' }).first()).toHaveAttribute('href', /^mailto:/);
  await page.getByTestId('start-live').click();

  await test.step('Brief: company, site, quick-pick numbers, linked budget, a family', async () => {
    await expect(page.getByTestId('generate-plan')).toBeDisabled(); // company name first
    await page.getByTestId('live-company').fill('Acme Data Centres');
    await page.getByTestId('live-site').getByRole('button', { name: 'Valdebebas business district' }).click();
    await expect(page.getByTestId('live-site-now')).toContainText('Valdebebas');
    await expect(page.getByTestId('brief-map3d')).toBeVisible({ timeout: 30_000 }); // the 3D map of Madrid, barrios and flats
    await page.getByTestId('brief-summary').getByRole('button', { name: '5', exact: true }).click();
    await expect(page.getByTestId('live-people')).toHaveValue('5');
    await page.getByTestId('budget-month').fill('11000'); // team per month → 2,200 per flat
    await expect(page.getByTestId('budget-flat')).toHaveValue('2200');
    await page.getByTestId('add-family').click();
    await expect(page.getByTestId('brief-voice')).toBeVisible();
    await page.getByTestId('generate-plan').click();
  });

  await test.step('Options: three plans from real flats, filtered by distance; pick the closest', async () => {
    await expect(page.getByRole('heading', { name: 'Three plans for your team' })).toBeVisible();
    await expect(page.getByText('Real listed apartments.', { exact: false })).toBeVisible();
    await page.getByTestId('distance-filter').getByRole('radio', { name: /^30 min/ }).click();
    await expect(page.getByTestId('listing-card').first()).toContainText('min to the site');
    await page.getByTestId('option-C').click();
    await page.getByTestId('release-plan').click();
  });

  await test.step('Approve and sign; flats are described (no links) and shown on the 3D map', async () => {
    await expect(page.getByTestId('listing-card').first()).toContainText('Listed on');
    await expect(page.getByTestId('listing-card').filter({ hasText: '(family)' }).first()).toContainText('2-bed');
    await expect(page.locator('[data-testid=plan-explorer] [data-testid=listing-card] a')).toHaveCount(0); // flats have no links (the map's own attribution links are fine)
    await expect(page.getByTestId('map3d')).toBeVisible();
    await expect(page.getByTestId('approve-plan')).toBeDisabled();
    await page.getByTestId('sign-agreement').locator('input').check();
    await page.getByTestId('approve-plan').click();
    await expect(page.getByText('Approved and signed')).toBeVisible();
  });

  await test.step('Invoice billed to the company', async () => {
    await page.goto('#/client/invoice');
    await expect(page.getByTestId('invoice')).toContainText('Acme Data Centres');
    await expect(page.getByTestId('footer-live')).toContainText('Airbnb');
  });
});
