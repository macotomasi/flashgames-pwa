import { test, expect } from '@playwright/test';

test('Le bouton d’installation PWA est visible et réagit au clic', async ({ page }) => {
  await page.goto('/');
  // Vérifie la présence du bouton d’installation (adapte le sélecteur/texte selon ton UI)
  const boutonInstaller = page.locator('text=/installer|add to home|ajouter à l\'écran d\'accueil/i');
  await expect(boutonInstaller).toBeVisible();

  // Simule un clic sur le bouton (l’installation réelle ne peut pas être automatisée, mais on peut vérifier la réaction UI)
  await boutonInstaller.click();

  // Vérifie qu’une modale ou un message de confirmation apparaît (adapte le texte selon ton UI)
  await expect(
    page.locator('text=/ajoutée|installée|pwa installée|application installée|merci/i')
  ).toBeVisible({ timeout: 3000 });
}); 