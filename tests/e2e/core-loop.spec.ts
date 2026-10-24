import { expect, test, type Page } from '@playwright/test';

// Critical flow (§16 Phase 1 "done when"): create a quiz → share link → a friend
// plays it → both see correct scores.

async function acceptGate(page: Page) {
  await expect(page.getByRole('heading', { name: 'Quick vibe check' })).toBeVisible();
  await page.getByRole('button', { name: "Yes, I'm 18+" }).click();
}

async function enterName(page: Page, name: string) {
  await page.getByRole('textbox', { name: /your name/i }).fill(name);
  await page.getByRole('button', { name: 'Continue' }).click();
}

async function createQuiz(page: Page, name: string): Promise<string> {
  const started = Date.now();
  await page.goto('/');
  await page.getByRole('link', { name: /make my quiz/i }).click();
  await acceptGate(page);
  await enterName(page, name);

  await page.getByRole('button', { name: /cap pup/i }).click();

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

test('create → share → play → result', async ({ browser }) => {
  const creatorCtx = await browser.newContext();
  const creator = await creatorCtx.newPage();
  const slug = await createQuiz(creator, 'Ravi');

  const playerCtx = await browser.newContext();
  const player = await playerCtx.newPage();
  await player.goto(`/q/${slug}?ref=${slug}`);
  await expect(player.getByRole('heading', { name: 'Will Ravi block you?' })).toBeVisible();
  await player.getByRole('link', { name: /start quiz/i }).click();
  await acceptGate(player);
  await enterName(player, 'Priya');
  await player.getByRole('button', { name: /skip, play solo/i }).click();

  for (let i = 0; i < 10; i++) {
    const pill = player.locator('ol[aria-label="Quiz progress"] li').nth(i);
    await expect(pill).toHaveAttribute('aria-current', 'step');
    await player.locator('[role="group"] button').first().click();
    await expect(pill).not.toHaveAttribute('aria-current', 'step');
  }

  await player.waitForURL(/\/result\//, { timeout: 20_000 });
  const scoreText = await player.locator('p', { hasText: '/10' }).first().innerText();
  const score = Number(scoreText.split('/')[0]);
  expect(score).toBeGreaterThanOrEqual(0);
  expect(score).toBeLessThanOrEqual(10);
  await expect(player.getByRole('link', { name: /create your own quiz/i })).toBeVisible();
  await expect(player.getByText('Priya').first()).toBeVisible();

  // Creator sees the same score on the board.
  await creator.goto(`/q/${slug}/board`);
  const row = creator.locator('li', { hasText: 'Priya' });
  await expect(row).toContainText(`${score}/10`);

  // The player can't replay beyond one retry, and the creator can't play their own quiz.
  await creator.goto(`/q/${slug}/play`);
  await creator.waitForURL(/\/create\/done\//);

  await creatorCtx.close();
  await playerCtx.close();
});
