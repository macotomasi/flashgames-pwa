import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('La page d’import/export (Paramètres) est accessible (a11y)', async ({ page }) => {
  await page.goto('/');
  await page.click('text=Paramètres');
  await expect(page.locator('text=Importer')).toBeVisible();

  const accessibilityScanResults = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze();

  expect(accessibilityScanResults.violations).toEqual([]);
}); 