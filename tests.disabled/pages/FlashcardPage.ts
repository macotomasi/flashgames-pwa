import { Page, Locator } from '@playwright/test';

export class FlashcardPage {
  readonly page: Page;
  readonly modal: Locator;
  readonly knowButton: Locator;
  readonly dontKnowButton: Locator;
  readonly bossCardIndicator: Locator;
  readonly pauseGameCheckbox: Locator;
  readonly questionText: Locator;
  readonly answerOptions: Locator;
  readonly errorButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.modal = page.locator('[data-testid="flashcard-modal"]');
    this.knowButton = page.locator('[data-testid="know-button"]');
    this.dontKnowButton = page.locator('[data-testid="dontknow-button"]');
    this.bossCardIndicator = page.locator('[data-testid="boss-card-indicator"]');
    this.pauseGameCheckbox = page.locator('input[type="checkbox"]').filter({ hasText: /figer le jeu/i });
    this.questionText = page.locator('h2:has-text("Question") + p');
    this.answerOptions = page.locator('button').filter({ hasText: /^(?!.*Erreur).*$/ }); // Exclude error button
    this.errorButton = page.locator('button:has-text("Erreur")');
  }

  async isVisible() {
    return await this.modal.isVisible();
  }

  async isBossCard() {
    return await this.bossCardIndicator.isVisible();
  }

  async answerKnow() {
    await this.knowButton.click();
  }

  async answerDontKnow() {
    await this.dontKnowButton.click();
  }

  async selectAnswer(index: number = 0) {
    const options = await this.answerOptions.all();
    if (options[index]) {
      await options[index].click();
    }
  }

  async selectCorrectAnswer(correctAnswer: string) {
    await this.page.locator(`button:has-text("${correctAnswer}")`).click();
  }

  async reportError() {
    await this.errorButton.click();
  }

  async pauseGame(pause: boolean = true) {
    const isChecked = await this.pauseGameCheckbox.isChecked();
    if (isChecked !== pause) {
      await this.pauseGameCheckbox.click();
    }
  }

  async getQuestionText() {
    return await this.questionText.textContent();
  }

  async waitForModal() {
    await this.modal.waitFor({ state: 'visible' });
  }

  async waitForModalToClose() {
    await this.modal.waitFor({ state: 'hidden' });
  }

  async completeFlashcard(know: boolean = true, selectFirstAnswer: boolean = true) {
    await this.waitForModal();
    
    if (know) {
      await this.answerKnow();
    } else {
      await this.answerDontKnow();
    }

    // Wait for answer options to appear
    await this.page.waitForTimeout(500);

    if (selectFirstAnswer) {
      await this.selectAnswer(0);
    }

    await this.waitForModalToClose();
  }
}