import { test, expect } from '@playwright/test';

test('La PWA fonctionne en mode offline (cache)', async ({ page, context }) => {
  await page.goto('/');
  // Précharge la page d'accueil et Tetris
  await page.click('text=Jouer');
  await page.click('text=Tetris');
  await expect(page.locator('text=Score')).toBeVisible();

  // Simule la perte de connexion
  await context.setOffline(true);

  // Recharge la page d'accueil offline
  await page.goto('/');
  await expect(page.locator('text=FlashGames')).toBeVisible();

  // Accède à Tetris offline
  await page.click('text=Jouer');
  await page.click('text=Tetris');
  await expect(page.locator('text=Score')).toBeVisible();

  // Rétablit la connexion pour la suite des tests
  await context.setOffline(false);
}); 