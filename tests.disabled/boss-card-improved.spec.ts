import { test, expect } from '@playwright/test';
import { HomePage } from './pages/HomePage';
import { GameSelectorPage } from './pages/GameSelectorPage';
import { FlashcardPage } from './pages/FlashcardPage';
import { simulateCorrectAnswers, waitForGameToLoad, checkForBossCard } from './utils/game-helpers';
import { GameType } from '@/types';

test.describe('Boss Card Feature', () => {
  test('Boss card appears after 7 consecutive correct answers', async ({ page }) => {
    // Navigate to game
    const homePage = new HomePage(page);
    const gameSelectorPage = new GameSelectorPage(page);
    const flashcardPage = new FlashcardPage(page);

    await homePage.goto();
    await homePage.navigateToGames();
    await gameSelectorPage.startTetrisWithAllDecks();
    await waitForGameToLoad(page, 'tetris');

    // Simulate 7 correct answers
    await simulateCorrectAnswers(page, 7);

    // The 8th flashcard should be a boss card
    const isBossCard = await checkForBossCard(page);
    expect(isBossCard).toBe(true);
  });

  test('Boss card resets consecutive count on failure', async ({ page }) => {
    const homePage = new HomePage(page);
    const gameSelectorPage = new GameSelectorPage(page);
    const flashcardPage = new FlashcardPage(page);

    await homePage.goto();
    await homePage.navigateToGames();
    await gameSelectorPage.startSpaceInvadersWithAllDecks();
    await waitForGameToLoad(page, 'space-invaders');

    // Simulate 6 correct answers
    await simulateCorrectAnswers(page, 6);

    // Fail the 7th answer
    await page.keyboard.press(' ');
    await flashcardPage.waitForModal();
    await flashcardPage.answerDontKnow();
    await page.waitForTimeout(500);
    await flashcardPage.selectAnswer(0);
    await flashcardPage.waitForModalToClose();

    // Now simulate 7 more correct answers
    await simulateCorrectAnswers(page, 7);

    // The next should be a boss card
    const isBossCard = await checkForBossCard(page);
    expect(isBossCard).toBe(true);
  });

  test('Boss card with pause game option', async ({ page }) => {
    const homePage = new HomePage(page);
    const gameSelectorPage = new GameSelectorPage(page);
    const flashcardPage = new FlashcardPage(page);

    await homePage.goto();
    await homePage.navigateToGames();
    await gameSelectorPage.startTetrisWithAllDecks();
    await waitForGameToLoad(page, 'tetris');

    // Trigger a flashcard and pause the game
    await page.keyboard.press(' ');
    await flashcardPage.waitForModal();
    await flashcardPage.pauseGame(true);

    // Complete the flashcard
    await flashcardPage.answerKnow();
    await page.waitForTimeout(500);
    await flashcardPage.selectAnswer(0);

    // Verify game is unpaused after answering
    await flashcardPage.waitForModalToClose();
    
    // Game should be running again (we can trigger another flashcard)
    await page.keyboard.press(' ');
    const canTriggerFlashcard = await flashcardPage.isVisible();
    expect(canTriggerFlashcard).toBe(true);
  });
});