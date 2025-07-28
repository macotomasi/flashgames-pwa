import { test, expect } from '@playwright/test';

test('Session complète de Space Invaders jusqu’au Game Over', async ({ page }) => {
  await page.goto('/');
  // Aller sur Space Invaders (adapte selon le flow réel)
  await page.click('text=Jouer');
  await page.click('text=Space Invaders');
  await expect(page.locator('text=Score')).toBeVisible();

  // Simule quelques mouvements (flèches)
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press(' '); // Tir

  // Simule un Game Over (en perdant toutes les vies)
  // Ici, on peut simuler des collisions ou attendre, mais on force le Game Over par répétition
  for (let i = 0; i < 50; i++) {
    await page.keyboard.press(' ');
    await page.waitForTimeout(100);
  }

  // Vérifie l’affichage du bouton 'Rejouer'
  await expect(page.locator('text=Rejouer')).toBeVisible();
}); 