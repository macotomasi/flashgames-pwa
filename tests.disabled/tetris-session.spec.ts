import { test, expect } from '@playwright/test';

test('Session complète de Tetris jusqu’au Game Over', async ({ page }) => {
  await page.goto('/');
  // Aller sur Tetris (adapte selon le flow réel)
  await page.click('text=Jouer');
  await page.click('text=Tetris');
  await expect(page.locator('text=Score')).toBeVisible();

  // Simule quelques mouvements (flèches)
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press(' '); // Hard drop

  // Simule un Game Over (en dropant plusieurs fois)
  for (let i = 0; i < 30; i++) {
    await page.keyboard.press(' ');
  }

  // Vérifie l’affichage du bouton 'Rejouer'
  await expect(page.locator('text=Rejouer')).toBeVisible();
}); 