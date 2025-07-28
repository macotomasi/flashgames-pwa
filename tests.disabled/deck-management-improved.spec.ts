import { test, expect } from '@playwright/test';
import { HomePage } from './pages/HomePage';
import { DeckManagerPage } from './pages/DeckManagerPage';
import { testDeck } from './fixtures/test-data';

test.describe('Deck Management', () => {
  test('Complete deck lifecycle: create, rename, add cards, delete', async ({ page }) => {
    const homePage = new HomePage(page);
    const deckManager = new DeckManagerPage(page);

    await homePage.goto();
    
    // Create deck
    await deckManager.createDeck(testDeck.name, testDeck.description, testDeck.icon);
    expect(await deckManager.isDeckVisible(testDeck.name)).toBe(true);

    // Add cards to deck
    for (const card of testDeck.cards.slice(0, 3)) {
      await deckManager.addCard(testDeck.name, card.front, card.back);
    }

    // Verify cards were added
    await page.goBack(); // Return to deck list
    const deckCard = page.locator(`text=${testDeck.name}`).locator('..');
    await expect(deckCard.locator('text=/3 cartes/')).toBeVisible();

    // Rename deck
    const newName = 'Deck Renommé E2E';
    await deckManager.renameDeck(testDeck.name, newName);
    expect(await deckManager.isDeckVisible(newName)).toBe(true);
    expect(await deckManager.isDeckVisible(testDeck.name)).toBe(false);

    // Delete deck
    await deckManager.deleteDeck(newName);
    expect(await deckManager.isDeckVisible(newName)).toBe(false);
  });

  test('Create multiple decks and verify count', async ({ page }) => {
    const homePage = new HomePage(page);
    const deckManager = new DeckManagerPage(page);

    await homePage.goto();

    const decksToCreate = [
      { name: 'Deck Math', description: 'Mathématiques', icon: '🔢' },
      { name: 'Deck Science', description: 'Sciences', icon: '🔬' },
      { name: 'Deck Histoire', description: 'Histoire', icon: '📜' }
    ];

    // Create multiple decks
    for (const deck of decksToCreate) {
      await deckManager.createDeck(deck.name, deck.description, deck.icon);
    }

    // Verify all decks are visible
    for (const deck of decksToCreate) {
      expect(await deckManager.isDeckVisible(deck.name)).toBe(true);
    }

    // Clean up
    for (const deck of decksToCreate) {
      await deckManager.deleteDeck(deck.name);
    }
  });

  test('Empty deck shows appropriate message', async ({ page }) => {
    const homePage = new HomePage(page);
    const deckManager = new DeckManagerPage(page);

    await homePage.goto();
    
    // Create empty deck
    await deckManager.createDeck('Deck Vide', 'Un deck sans cartes');
    
    // Open deck
    await deckManager.selectDeck('Deck Vide');
    
    // Verify empty state message
    await expect(page.locator('text=/aucune carte|deck vide/i')).toBeVisible();
    
    // Clean up
    await page.goBack();
    await deckManager.deleteDeck('Deck Vide');
  });
});