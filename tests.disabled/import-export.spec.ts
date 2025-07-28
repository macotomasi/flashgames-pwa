import { test, expect } from '@playwright/test';

// Ce test suppose que tu as un bouton ou une UI pour importer/exporter les données
// Adapte les sélecteurs et les fichiers selon ton implémentation

test('Import et export de données (cartes ou decks)', async ({ page }) => {
  await page.goto('/');

  // Aller à l'import/export (adapte selon l'UI réelle)
  await page.click('text=Importer');

  // Simule l'import d'un fichier (adapte le sélecteur et le fichier)
  const [fileChooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.click('input[type="file"]') // ou le bouton qui déclenche le file input
  ]);
  await fileChooser.setFiles('tests/fixtures/import-sample.json');

  // Vérifie l'affichage d'un message de succès ou la présence des données importées
  await expect(page.locator('text=Import réussi')).toBeVisible({ timeout: 5000 });

  // Tester l'export (adapte selon l'UI réelle)
  await page.click('text=Exporter');
  // Vérifie que le téléchargement a été déclenché (optionnel)
  // await expect(page.locator('text=Export réussi')).toBeVisible({ timeout: 5000 });
}); 