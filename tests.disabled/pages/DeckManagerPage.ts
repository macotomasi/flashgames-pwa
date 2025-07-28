import { Page, Locator } from '@playwright/test';

export class DeckManagerPage {
  readonly page: Page;
  readonly createDeckButton: Locator;
  readonly deckNameInput: Locator;
  readonly deckDescriptionInput: Locator;
  readonly validateButton: Locator;
  readonly cancelButton: Locator;
  readonly deckList: Locator;

  constructor(page: Page) {
    this.page = page;
    this.createDeckButton = page.locator('[data-testid="create-deck-button"]');
    this.deckNameInput = page.locator('input[placeholder="Nom du deck"]');
    this.deckDescriptionInput = page.locator('textarea[placeholder="Description"]');
    this.validateButton = page.getByRole('button', { name: /valider/i });
    this.cancelButton = page.getByRole('button', { name: /annuler/i });
    this.deckList = page.locator('[data-testid="deck-list"]');
  }

  async createDeck(name: string, description?: string, icon?: string) {
    await this.createDeckButton.click();
    await this.deckNameInput.fill(name);
    
    if (description) {
      await this.deckDescriptionInput.fill(description);
    }
    
    if (icon) {
      await this.page.locator(`button:has-text("${icon}")`).click();
    }
    
    await this.validateButton.click();
    await this.page.waitForSelector(`text=${name}`);
  }

  async selectDeck(name: string) {
    await this.page.locator(`text=${name}`).click();
  }

  async renameDeck(oldName: string, newName: string) {
    await this.selectDeck(oldName);
    await this.page.getByRole('button', { name: /renommer/i }).click();
    await this.deckNameInput.clear();
    await this.deckNameInput.fill(newName);
    await this.validateButton.click();
  }

  async deleteDeck(name: string) {
    await this.selectDeck(name);
    await this.page.getByRole('button', { name: /supprimer/i }).click();
    await this.page.getByRole('button', { name: /confirmer/i }).click();
  }

  async addCard(deckName: string, front: string, back: string) {
    await this.selectDeck(deckName);
    await this.page.getByRole('button', { name: /ajouter une carte/i }).click();
    await this.page.locator('input[name="front"]').fill(front);
    await this.page.locator('input[name="back"]').fill(back);
    await this.validateButton.click();
  }

  async isDeckVisible(name: string) {
    return await this.page.locator(`text=${name}`).isVisible();
  }

  async getDeckCount() {
    const decks = await this.page.locator('[data-testid="deck-card"]').all();
    return decks.length;
  }
}