import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('Accessibilité de la modale de flashcard (a11y)', async ({ page }) => {
  await page.goto('/');
  // Aller sur Tetris et déclencher une flashcard (adapte selon le flow réel)
  await page.click('text=Jouer');
  await page.click('text=Tetris');
  await expect(page.locator('text=Score')).toBeVisible();

  // Simule des actions pour déclencher une flashcard
  for (let i = 0; i < 5; i++) {
    await page.keyboard.press(' ');
    await page.waitForTimeout(100);
    if (await page.locator('text=Je sais').isVisible({ timeout: 1000 }).catch(() => false)) {
      break;
    }
  }

  // Vérifie l'accessibilité de la modale de flashcard
  const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
  if (accessibilityScanResults.violations.length > 0) {
    console.log('Violations:', accessibilityScanResults.violations);
  }
  expect(accessibilityScanResults.violations).toEqual([]);
}); 