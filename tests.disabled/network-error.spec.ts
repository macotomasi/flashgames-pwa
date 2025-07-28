import { test, expect } from '@playwright/test';

test('Affichage d’un message d’erreur lors d’une perte réseau sur import/export', async ({ page, context }) => {
  await page.goto('/');
  // Va sur la page d’import/export (adapte le sélecteur si besoin)
  await page.click('text=Paramètres');
  await page.click('text=Importer');

  // Simule la perte de connexion
  await context.setOffline(true);

  // Tente d’importer un fichier (adapte le sélecteur si besoin)
  // Ici, on simule un clic sur le bouton d’import
  await page.click('text=Importer depuis Firebase');

  // Vérifie qu’un message d’erreur s’affiche
  await expect(
    page.locator('text=/connexion requise|erreur réseau|impossible de se connecter/i')
  ).toBeVisible({ timeout: 3000 });

  // Rétablit la connexion pour la suite
  await context.setOffline(false);
}); 