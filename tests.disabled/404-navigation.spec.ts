import { test, expect } from '@playwright/test';

test('Page 404 et navigation robuste', async ({ page }) => {
  await page.goto('/une-page-inexistante');
  await expect(page.locator('text=404')).toBeVisible();
  // Retour à l’accueil
  await page.click('text=Accueil');
  await expect(page.locator('text=Jouer')).toBeVisible();
}); 