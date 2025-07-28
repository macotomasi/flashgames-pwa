import { test, expect } from '@playwright/test';

test('Gestion des sons : activation/désactivation et accessibilité', async ({ page }) => {
  await page.goto('/');
  await page.click('text=Paramètres');
  // Active le son
  await page.click('text=Activer le son');
  // Lance un jeu et vérifie qu’un son est joué (on ne peut pas tester le son, mais on peut vérifier l’état UI)
  await page.click('text=Jouer');
  await page.click('text=Tetris');
  await page.click('text=Valider');
  await expect(page.locator('text=Son activé')).toBeVisible();
  // Désactive le son
  await page.click('text=Paramètres');
  await page.click('text=Désactiver le son');
  await expect(page.locator('text=Son désactivé')).toBeVisible();
}); 