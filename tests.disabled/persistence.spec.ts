import { test, expect } from '@playwright/test';

test('La progression et le score sont persistés après rechargement', async ({ page, context, browser }) => {
  await page.goto('/');
  // Lance une partie de Tetris et marque des points
  await page.click('text=Jouer');
  await page.click('text=Tetris');
  await expect(page.locator('text=Score')).toBeVisible();

  // Simule une action de jeu (adapte si besoin)
  // Par exemple, appuie sur la flèche bas pour faire tomber une pièce
  await page.keyboard.press('ArrowDown');
  // Récupère le score affiché
  const scoreAvant = await page.locator('text=Score').textContent();

  // Recharge la page
  await page.reload();
  await page.click('text=Jouer');
  await page.click('text=Tetris');
  await expect(page.locator('text=Score')).toBeVisible();
  const scoreApres = await page.locator('text=Score').textContent();

  // Vérifie que le score est bien conservé (ou supérieur)
  expect(Number(scoreApres?.replace(/\D/g, ''))).toBeGreaterThanOrEqual(Number(scoreAvant?.replace(/\D/g, '')));

  // (Optionnel) Ferme et rouvre un nouvel onglet pour simuler une réouverture complète
  const page2 = await context.newPage();
  await page2.goto('/');
  await page2.click('text=Jouer');
  await page2.click('text=Tetris');
  await expect(page2.locator('text=Score')).toBeVisible();
  const scoreReouverture = await page2.locator('text=Score').textContent();
  expect(Number(scoreReouverture?.replace(/\D/g, ''))).toBeGreaterThanOrEqual(Number(scoreAvant?.replace(/\D/g, '')));
  await page2.close();
}); 