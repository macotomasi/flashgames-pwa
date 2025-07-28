import { test, expect } from '@playwright/test';

test('Synchronisation multi-onglets : progression partagée', async ({ context }) => {
  const page1 = await context.newPage();
  const page2 = await context.newPage();
  await page1.goto('/');
  await page2.goto('/');
  // Lance une partie sur le premier onglet
  await page1.click('text=Jouer');
  await page1.click('text=Tetris');
  await page1.click('text=Valider');
  // Vérifie la progression sur le second onglet
  await page2.reload();
  await page2.click('text=Jouer');
  await page2.click('text=Tetris');
  await expect(page2.locator('text=/progression du jour|objectif atteint|bravo/i')).toBeVisible();
  await page1.close();
  await page2.close();
}); 