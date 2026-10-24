import { expect, test } from '@playwright/test';
import { createQuiz } from './helpers';

// Privacy and safety guarantees (§13): age gate, k-anonymity floor, CSRF, erasure.

test('under-18s are stopped kindly and nothing is created', async ({ page }) => {
  await page.goto('/create');
  await page.getByRole('button', { name: "No, I'm under 18" }).click();
  await expect(page.getByRole('heading', { name: /come back in a bit/i })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: /come back in a bit/i })).toBeVisible();
  const res = await page.request.post('/api/create/start', { data: { name: 'Kid' } });
  expect(res.status()).toBe(403);
});

test('a new hostel report stays locked below 5 respondents', async ({ page }) => {
  await page.goto('/');
  expect((await page.request.post('/api/session/consent', { data: { adult: true } })).ok()).toBeTruthy();
  const created = await page.request.post('/api/hostels', {
    data: { name: `Locked Report Hostel ${Date.now() % 100000}`, city: 'Hyderabad', area: 'Tarnaka', type: 'girls', confirmedDifferent: true },
  });
  const { hostel } = await created.json();
  await page.goto(`/report/${hostel.slug}`);
  await expect(page.getByText('0 students have played, need 5 to unlock the report.')).toBeVisible();
  await expect(page.getByText('Mess food rating')).toHaveCount(0);
});

test('cross-site writes are rejected', async ({ page }) => {
  await page.goto('/');
  const res = await page.request.post('/api/session/consent', { data: { adult: true }, headers: { origin: 'https://evil.example' } });
  expect(res.status()).toBe(403);
});

test('delete my data erases the quiz', async ({ page }) => {
  const slug = await createQuiz(page, 'Eraseme');
  await page.goto('/privacy');
  await expect(page.getByRole('link', { name: 'Will Eraseme block you?' })).toBeVisible();
  page.once('dialog', (d) => d.accept());
  await page.getByRole('button', { name: /delete everything/i }).click();
  await page.waitForURL('http://localhost:3000/');
  await page.goto(`/q/${slug}`);
  await expect(page.getByRole('heading', { name: /vanished/i })).toBeVisible();
});
