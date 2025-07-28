import { test, expect } from '@playwright/test';

test('Affichage d’une notification de progression après une action', async ({ page }) => {
  await page.goto('/');
  // Aller sur Tetris (adapte selon le flow réel)
  await page.click('text=Jouer');
  await page.click('text=Tetris');
  await expect(page.locator('text=Score')).toBeVisible();

  // Simule des actions pour déclencher une notification (ex : répondre à une flashcard)
  // Ici, on simule plusieurs hard drops pour accélérer la progression
  for (let i = 0; i < 20; i++) {
    await page.keyboard.press(' ');
    await page.waitForTimeout(100);
  }

  // Vérifie l’affichage d’une notification de progression (niveau, streak, ou daily)
  await expect(
    page.locator('text=/Niveau|Récompense quotidienne|Série|streak|level|daily/i')
  ).toBeVisible({ timeout: 5000 });
});

test('Notification de progression quotidienne affichée', async ({ page }) => {
  await page.goto('/');
  // Simule une action qui déclenche la progression (ex: valider une flashcard)
  await page.click('text=Jouer');
  await page.click('text=Tetris');
  await page.click('text=Valider');
  // Vérifie la notification
  await expect(page.locator('text=/progression du jour|objectif atteint|bravo/i')).toBeVisible();
}); 