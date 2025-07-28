import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('Accessibilité de la page Gestion des decks (a11y)', async ({ page }) => {
  await page.goto('/');
  // Navigue vers la gestion des decks (adapte selon ton UI)
  await page.click('text=Créer un deck');
  // Optionnel : remplir le formulaire pour accéder à la page de gestion d’un deck
  await page.fill('input[name="deckName"]', 'Deck A11y');
  await page.fill('input[name="deckDescription"]', 'Deck accessibilité');
  await page.click('text=Valider');
  await page.click('text=Deck A11y');

  const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
  if (accessibilityScanResults.violations.length > 0) {
    console.log('Violations:', accessibilityScanResults.violations);
  }
  expect(accessibilityScanResults.violations).toEqual([]);
}); 