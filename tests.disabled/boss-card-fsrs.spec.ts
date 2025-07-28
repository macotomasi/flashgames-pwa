import { test, expect } from '@playwright/test';

test('Gestion des boss cards FSRS', async ({ page }) => {
  await page.goto('/');
  await page.click('text=Jouer');
  await page.click('text=Tetris');
  // Simule l’apparition d’une boss card (adapte le sélecteur si besoin)
  await page.click('text=Boss Card');
  await expect(page.locator('text=Boss')).toBeVisible();
  // Valide la boss card
  await page.click('text=Bonne réponse');
  await expect(page.locator('text=Bravo')).toBeVisible();
}); 