import { test, expect } from '@playwright/test';

test('Affichage d’une page 404 pour une route inconnue', async ({ page }) => {
  await page.goto('/une-page-qui-nexiste-pas');
  await expect(page.locator('text=404')).toBeVisible();
  await expect(page.locator('text=Page non trouvée')).toBeVisible();
});

test('Affichage d’une erreur lors de la suppression d’un deck utilisé', async ({ page }) => {
  await page.goto('/');
  // Créer un deck et y ajouter une carte (adapte selon l’UI réelle)
  await page.click('text=Créer un deck');
  await page.fill('input[name="deckName"]', 'Deck Erreur');
  await page.fill('input[name="deckDescription"]', 'Deck pour test erreur');
  await page.click('text=Valider');
  await page.click('text=Deck Erreur');
  await page.click('text=Ajouter une carte');
  await page.fill('input[name="front"]', 'Q Erreur');
  await page.fill('input[name="back"]', 'R Erreur');
  await page.click('text=Valider');

  // Tenter de supprimer le deck alors qu’il est utilisé (adapte selon la logique métier)
  await page.click('text=Supprimer le deck');
  await page.click('text=Confirmer');
  // Vérifie l’affichage d’un message d’erreur
  await expect(page.locator('text=Erreur')).toBeVisible({ timeout: 5000 });
}); 