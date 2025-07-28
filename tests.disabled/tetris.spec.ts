import { test, expect } from '@playwright/test';

test('Tetris démarre et affiche le score', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('text=Score')).toBeVisible();
}); 