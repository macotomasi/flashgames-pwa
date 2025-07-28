import { test, expect } from '@playwright/test';

test('Présentation de la carte boss après 7 bonnes réponses', async ({ page }) => {
  await page.goto('/');
  // Aller sur Tetris (adapte selon le flow réel)
  await page.click('text=Jouer');
  await page.click('text=Tetris');
  await expect(page.locator('text=Score')).toBeVisible();

  // Simule 7 bonnes réponses (ex : hard drop pour déclencher les flashcards)
  for (let i = 0; i < 7; i++) {
    await page.keyboard.press(' ');
    // Si une flashcard apparaît, réponds correctement
    if (await page.locator('text=Je sais').isVisible({ timeout: 1000 }).catch(() => false)) {
      await page.click('text=Je sais');
    }
  }

  // Vérifie l'affichage de la carte boss (ex : badge, texte spécifique, etc.)
  // À adapter selon ton UI
  await expect(page.locator('text=/boss|carte difficile|challenge/i')).toBeVisible({ timeout: 5000 });

  // Répond à la carte boss
  if (await page.locator('text=Je sais').isVisible({ timeout: 1000 }).catch(() => false)) {
    await page.click('text=Je sais');
  }

  // Vérifie que la carte boss disparaît après la réponse
  await expect(page.locator('text=/boss|carte difficile|challenge/i')).not.toBeVisible({ timeout: 5000 });
}); 