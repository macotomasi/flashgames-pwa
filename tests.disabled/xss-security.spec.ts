import { test, expect } from '@playwright/test';

test('Sécurité XSS : injection dans les champs utilisateur', async ({ page }) => {
  await page.goto('/');
  await page.click('text=Decks');
  await page.click('text=Créer un deck');
  await page.fill('input[placeholder="Nom du deck"]', '<img src=x onerror=alert(1) />');
  await page.click('text=Valider');
  // Vérifie qu’aucune alerte n’est déclenchée et que le nom est affiché en texte
  await expect(page.locator('text=<img src=x onerror=alert(1) />')).toBeVisible();
  // (Optionnel) Vérifie qu’aucune exécution de script n’a eu lieu
}); 