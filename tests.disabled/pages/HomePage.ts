import { Page, Locator } from '@playwright/test';

export class HomePage {
  readonly page: Page;
  readonly playButton: Locator;
  readonly decksButton: Locator;
  readonly createDeckButton: Locator;
  readonly importFirebaseButton: Locator;
  readonly progressionLevel: Locator;
  readonly streakCounter: Locator;
  readonly bestScore: Locator;

  constructor(page: Page) {
    this.page = page;
    this.playButton = page.getByRole('link', { name: /jouer/i });
    this.decksButton = page.getByRole('link', { name: /decks/i });
    this.createDeckButton = page.locator('[data-testid="create-deck-button"]');
    this.importFirebaseButton = page.locator('[data-testid="import-firebase-button"]');
    this.progressionLevel = page.locator('h2').filter({ hasText: /niveau/i });
    this.streakCounter = page.locator('text=/Jour \\d+/');
    this.bestScore = page.locator('text=/Record: \\d+/');
  }

  async goto() {
    await this.page.goto('/');
  }

  async navigateToGames() {
    await this.playButton.click();
  }

  async navigateToDecks() {
    await this.decksButton.click();
  }

  async openCreateDeckModal() {
    await this.createDeckButton.click();
  }

  async openImportModal() {
    await this.importFirebaseButton.click();
  }

  async getProgressionInfo() {
    const level = await this.progressionLevel.textContent();
    const streak = await this.streakCounter.textContent();
    const score = await this.bestScore.textContent();
    
    return { level, streak, score };
  }

  async waitForPageLoad() {
    await this.page.waitForSelector('text=FlashGames');
  }
}