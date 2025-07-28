import { test, expect } from '@playwright/test';

test('Gestion des decks : création, renommage, suppression', async ({ page }) => {
  await page.goto('/');
  await page.click('text=Decks');

  // Création
  await page.click('text=Créer un deck');
  await page.fill('input[placeholder="Nom du deck"]', 'Deck Test');
  await page.click('text=Valider');
  await expect(page.locator('text=Deck Test')).toBeVisible();

  // Renommage
  await page.click('text=Deck Test');
  await page.click('text=Renommer');
  await page.fill('input[placeholder="Nom du deck"]', 'Deck Renommé');
  await page.click('text=Valider');
  await expect(page.locator('text=Deck Renommé')).toBeVisible();

  // Suppression
  await page.click('text=Deck Renommé');
  await page.click('text=Supprimer');
  await page.click('text=Confirmer');
  await expect(page.locator('text=Deck Renommé')).not.toBeVisible();
}); 