import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('Accessibilité de la page Import/Export (a11y)', async ({ page }) => {
  await page.goto('/');
  // Navigue vers la page d'import/export (adapte selon ton UI)
  await page.click('text=Importer');

  const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
  if (accessibilityScanResults.violations.length > 0) {
    console.log('Violations:', accessibilityScanResults.violations);
  }
  expect(accessibilityScanResults.violations).toEqual([]);
}); 