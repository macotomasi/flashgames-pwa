import { test, expect, devices } from '@playwright/test';

test.use({ ...devices['iPhone 12'] });

test('L’UI est responsive et les jeux sont jouables sur mobile', async ({ page }) => {
  await page.goto('/');
  // Vérifie que le menu principal est visible et adapté au mobile
  await expect(page.locator('text=Jouer')).toBeVisible();
  // Vérifie que le layout ne déborde pas
  const body = page.locator('body');
  const overflow = await body.evaluate((el) => el.scrollWidth > el.clientWidth);
  expect(overflow).toBeFalsy();

  // Lance Tetris et vérifie la jouabilité
  await page.click('text=Jouer');
  await page.click('text=Tetris');
  await expect(page.locator('text=Score')).toBeVisible();
  // Vérifie la présence des contrôles tactiles (adapte le sélecteur si besoin)
  await expect(page.locator('text=/contrôle|toucher|touch/i')).toBeVisible();

  // Retour à l’accueil
  await page.click('text=Accueil');

  // Lance Space Invaders et vérifie la jouabilité
  await page.click('text=Jouer');
  await page.click('text=Space Invaders');
  await expect(page.locator('text=Score')).toBeVisible();
  await expect(page.locator('text=/contrôle|toucher|touch/i')).toBeVisible();
}); 