import { test, expect } from '@playwright/test';

test('homepage has title and get started link', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveTitle(/DayFlow/);

  const getStarted = page.getByRole('link', { name: /get started/i });
  await expect(getStarted).toBeVisible();
  
  await getStarted.click();
  await expect(page).toHaveURL(/dashboard/);
});
