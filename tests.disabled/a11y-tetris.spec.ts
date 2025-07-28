import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('Accessibilité de la page Tetris (a11y)', async ({ page }) => {
  await page.goto('/');
  await page.click('text=Jouer');
  await page.click('text=Tetris');
  const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
  if (accessibilityScanResults.violations.length > 0) {
    console.log('Violations:', accessibilityScanResults.violations);
  }
  expect(accessibilityScanResults.violations).toEqual([]);
}); 