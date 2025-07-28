import { Page, Locator } from '@playwright/test';
import { GameType } from '@/types';

export class GameSelectorPage {
  readonly page: Page;
  readonly backToDecksButton: Locator;
  readonly tetrisButton: Locator;
  readonly spaceInvadersButton: Locator;
  readonly pacmanButton: Locator;
  readonly pongButton: Locator;
  readonly allDecksButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.backToDecksButton = page.locator('[data-testid="back-to-decks-button"]');
    this.tetrisButton = page.locator('[data-testid="game-button-tetris"]');
    this.spaceInvadersButton = page.locator('[data-testid="game-button-space_invaders"]');
    this.pacmanButton = page.locator('[data-testid="game-button-pacman"]');
    this.pongButton = page.locator('[data-testid="game-button-pong"]');
    this.allDecksButton = page.getByRole('button', { name: /tous les decks/i });
  }

  async selectGame(gameType: GameType) {
    switch (gameType) {
      case GameType.TETRIS:
        await this.tetrisButton.click();
        break;
      case GameType.SPACE_INVADERS:
        await this.spaceInvadersButton.click();
        break;
      case GameType.PACMAN:
        await this.pacmanButton.click();
        break;
      case GameType.PONG:
        await this.pongButton.click();
        break;
    }
  }

  async selectDeck(deckName: string | 'all') {
    if (deckName === 'all') {
      await this.allDecksButton.click();
    } else {
      await this.page.getByRole('button', { name: deckName }).click();
    }
  }

  async goBack() {
    await this.backToDecksButton.click();
  }

  async startTetrisWithAllDecks() {
    await this.selectGame(GameType.TETRIS);
    await this.page.waitForSelector('text=Choisir les cartes à réviser');
    await this.selectDeck('all');
  }

  async startSpaceInvadersWithAllDecks() {
    await this.selectGame(GameType.SPACE_INVADERS);
    await this.page.waitForSelector('text=Choisir les cartes à réviser');
    await this.selectDeck('all');
  }
}