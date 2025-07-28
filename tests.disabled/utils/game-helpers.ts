import { Page } from '@playwright/test';
import { FlashcardPage } from '../pages/FlashcardPage';

export async function simulateCorrectAnswers(page: Page, count: number) {
  const flashcard = new FlashcardPage(page);
  
  for (let i = 0; i < count; i++) {
    // Trigger flashcard (space key for Tetris/Space Invaders)
    await page.keyboard.press(' ');
    
    // Wait a bit for flashcard to appear
    await page.waitForTimeout(500);
    
    // Check if flashcard appeared
    if (await flashcard.isVisible()) {
      await flashcard.completeFlashcard(true, true);
    }
    
    // Small delay between answers
    await page.waitForTimeout(100);
  }
}

export async function waitForGameToLoad(page: Page, gameType: 'tetris' | 'space-invaders') {
  if (gameType === 'tetris') {
    await page.waitForSelector('text=Score');
    await page.waitForSelector('text=Lignes');
  } else if (gameType === 'space-invaders') {
    await page.waitForSelector('text=Score');
    await page.waitForSelector('text=Wave');
  }
  
  // Wait for canvas to be ready
  await page.waitForSelector('canvas');
  await page.waitForTimeout(500); // Extra time for game initialization
}

export async function pauseGame(page: Page) {
  await page.keyboard.press('p');
}

export async function unpauseGame(page: Page) {
  await page.keyboard.press('p');
}

export async function navigateToGame(page: Page, gameType: 'tetris' | 'space-invaders') {
  await page.goto('/');
  await page.click('text=Jouer');
  
  if (gameType === 'tetris') {
    await page.click('[data-testid="game-button-tetris"]');
  } else {
    await page.click('[data-testid="game-button-space_invaders"]');
  }
  
  // Select all decks by default
  await page.waitForSelector('text=Choisir les cartes à réviser');
  await page.click('text=Tous les decks');
  
  await waitForGameToLoad(page, gameType);
}

export async function getGameScore(page: Page): Promise<number> {
  const scoreText = await page.locator('text=/Score.*\\d+/').textContent();
  const match = scoreText?.match(/\d+/);
  return match ? parseInt(match[0], 10) : 0;
}

export async function checkForBossCard(page: Page): Promise<boolean> {
  const flashcard = new FlashcardPage(page);
  
  // Trigger a flashcard
  await page.keyboard.press(' ');
  await page.waitForTimeout(500);
  
  if (await flashcard.isVisible()) {
    const isBoss = await flashcard.isBossCard();
    await flashcard.completeFlashcard(true, true);
    return isBoss;
  }
  
  return false;
}

export async function setupOfflineMode(page: Page) {
  // Visit important pages first to cache them
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  
  await page.click('text=Jouer');
  await page.waitForLoadState('networkidle');
  
  await page.goBack();
  await page.waitForLoadState('networkidle');
}