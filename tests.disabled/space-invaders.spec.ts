import { test, expect } from '@playwright/test';

test('Space Invaders démarre et affiche le score', async ({ page }) => {
  await page.goto('/');
  // Navigue vers le sélecteur de jeu si besoin
  await page.click('text=Jouer'); // ou adapte selon le bouton réel
  await page.click('text=Space Invaders');
  await expect(page.locator('text=Score')).toBeVisible();
}); 