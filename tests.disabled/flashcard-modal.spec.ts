import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('Modale de flashcard : navigation, validation, accessibilité', async ({ page }) => {
  await page.goto('/');
  await page.click('text=Jouer');
  await page.click('text=Tetris');
  await page.click('text=Valider');
  // Navigation dans la modale
  await expect(page.locator('role=dialog')).toBeVisible();
  await page.click('text=Suivante');
  await expect(page.locator('role=dialog')).toBeVisible();
  // Validation
  await page.click('text=Bonne réponse');
  await expect(page.locator('text=Bravo')).toBeVisible();
  // Accessibilité
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
}); 