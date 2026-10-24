import { expect, type Page } from '@playwright/test';

// Shared steps for the e2e specs.

export async function acceptGate(page: Page) {
  await expect(page.getByRole('heading', { name: 'Quick vibe check' })).toBeVisible();
  await page.getByRole('button', { name: "Yes, I'm 18+" }).click();
}

export async function enterName(page: Page, name: string) {
  await page.getByPlaceholder('Your name').fill(name);
  await page.getByRole('button', { name: 'Continue' }).click();
}

export async function createQuiz(page: Page, name: string): Promise<string> {
  const started = Date.now();
  await page.goto('/');
  await page.getByRole('link', { name: /make my quiz/i }).click();
  await acceptGate(page);
  await enterName(page, name);

  await page.getByRole('button', { name: /^boy/i }).click();

  // Add a brand-new hostel through the "can't find mine" path.
  await page.getByRole('button', { name: /can't find mine/i }).click();
  const sheet = page.getByRole('dialog');
  await sheet.getByLabel('Hostel name').fill(`E2E Test Hostel ${Date.now() % 100000}`);
  await sheet.getByLabel('Area').selectOption('Maisammaguda');
  await sheet.getByRole('button', { name: 'Add hostel' }).click();

  // Pick 10: tap candidates in order; caps (max 3 hostel-life) silently skip extras.
  await expect(page.getByRole('heading', { name: 'Pick 10 questions' })).toBeVisible();
  const items = page.locator('ul li button[aria-pressed]');
  const count = await items.count();
  for (let i = 0; i < count; i++) {
    if (await page.getByText('10/10 picked').isVisible()) break;
    const item = items.nth(i);
    if (await item.isEnabled()) await item.click();
  }
  await expect(page.getByText('10/10 picked')).toBeVisible();
  await page.getByRole('button', { name: /answer them/i }).click();

  // Swap the first question once, then answer all 10.
  await page.getByRole('button', { name: /swap this question/i }).click();
  for (let i = 0; i < 10; i++) {
    await expect(page.getByText(`${i + 1}/10`, { exact: true })).toBeVisible();
    await page.locator('section .grid button').first().click();
  }
  await page.getByRole('button', { name: 'Publish my quiz' }).click();
  await page.waitForURL(/\/create\/done\//);
  await expect(page.getByRole('heading', { name: /your quiz is live/i })).toBeVisible();
  expect(Date.now() - started).toBeLessThan(120_000);
  return page.url().split('/create/done/')[1];
}
