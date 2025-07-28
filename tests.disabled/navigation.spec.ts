import { test, expect } from '@playwright/test';

test('Navigation entre les pages principales', async ({ page }) => {
  await page.goto('/');
  // Accueil
  await expect(page.locator('text=FlashGames')).toBeVisible();

  // Aller au sélecteur de jeu
  await page.click('text=Jouer'); // adapte selon le bouton réel
  await expect(page.locator('text=Choisir un jeu')).toBeVisible();

  // Aller sur Tetris
  await page.click('text=Tetris');
  await expect(page.locator('text=Score')).toBeVisible();

  // Retour au sélecteur de jeu
  await page.click('text=Retour'); // adapte selon le bouton réel
  await expect(page.locator('text=Choisir un jeu')).toBeVisible();

  // Aller sur Space Invaders
  await page.click('text=Space Invaders');
  await expect(page.locator('text=Score')).toBeVisible();

  // Retour à l'accueil
  await page.click('text=Retour aux decks'); // adapte selon le bouton réel
  await expect(page.locator('text=FlashGames')).toBeVisible();
}); 