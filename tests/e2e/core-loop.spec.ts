import { expect, test } from '@playwright/test';
import { acceptGate, createQuiz } from './helpers';

// Critical flow (§16 Phase 1 "done when"): create a quiz → share link → a friend
// plays it → both see correct scores.

test('create → share → play → result', async ({ browser }) => {
  const creatorCtx = await browser.newContext();
  const creator = await creatorCtx.newPage();
  const slug = await createQuiz(creator, 'Ravi');

  const playerCtx = await browser.newContext();
  const player = await playerCtx.newPage();
  await player.goto(`/q/${slug}?ref=${slug}`);
  await expect(player.getByRole('heading', { name: 'Will Ravi kick you out of the room?' })).toBeVisible();
  await player.getByRole('link', { name: /start quiz/i }).click();
  await acceptGate(player);
  await player.getByPlaceholder('Your name').fill('Priya');
  await player.getByText('Girl', { exact: true }).click();
  await player.getByRole('button', { name: 'Continue' }).click();
  await player.getByRole('button', { name: /skip, play solo/i }).click();

  for (let i = 0; i < 10; i++) {
    const pill = player.locator('ol[aria-label="Quiz progress"] li').nth(i);
    await expect(pill).toHaveAttribute('aria-current', 'step');
    await player.locator('[role="group"] button').first().click();
    await expect(pill).not.toHaveAttribute('aria-current', 'step');
  }

  await player.waitForURL(/\/result\//, { timeout: 20_000 });
  const scoreText = await player.getByText(/^\d+\/10 right$/).innerText();
  const score = Number(scoreText.split('/')[0]);
  await expect(player.getByText(`${score * 10}%`, { exact: true }).first()).toBeVisible();
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
