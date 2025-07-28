import { FSRSEngine } from './fsrs-engine';
import { Card, CardState } from '@/types';

describe('FSRSEngine', () => {
  const fsrsEngine = new FSRSEngine();

  const now = Date.now();
  const yesterday = Date.now() - 24 * 60 * 60 * 1000;
  const tomorrow = Date.now() + 24 * 60 * 60 * 1000;

  const cards: Card[] = [
    {
      id: '1', front: 'A', back: 'B', deckId: 'd1', state: CardState.New, createdAt: now, updatedAt: now,
      stability: 1, difficulty: 1, elapsedDays: 0, scheduledDays: 0, reps: 0, lapses: 0
    },
    {
      id: '2', front: 'C', back: 'D', deckId: 'd1', state: CardState.Review, createdAt: now, updatedAt: now, nextReview: yesterday,
      stability: 1, difficulty: 1, elapsedDays: 0, scheduledDays: 0, reps: 0, lapses: 0
    }, // due
    {
      id: '3', front: 'E', back: 'F', deckId: 'd1', state: CardState.Review, createdAt: now, updatedAt: now, nextReview: tomorrow,
      stability: 1, difficulty: 1, elapsedDays: 0, scheduledDays: 0, reps: 0, lapses: 0
    }, // not due
    {
      id: '4', front: 'G', back: 'H', deckId: 'd1', state: CardState.Learning, createdAt: now, updatedAt: now, nextReview: yesterday,
      stability: 1, difficulty: 1, elapsedDays: 0, scheduledDays: 0, reps: 0, lapses: 0
    }, // due
    {
      id: '5', front: 'I', back: 'J', deckId: 'd1', state: CardState.Review, createdAt: now, updatedAt: now, nextReview: yesterday, lapses: 3,
      stability: 1, difficulty: 1, elapsedDays: 0, scheduledDays: 0, reps: 0, lapses: 0
    }, // boss candidate
  ];

  it('retourne uniquement les cartes dues pour révision', () => {
    const due = fsrsEngine.getCardsToReview(cards);
    const dueIds = due.map(c => c.id);
    expect(dueIds).toContain('2');
    expect(dueIds).toContain('4');
    expect(dueIds).toContain('5');
    expect(dueIds).not.toContain('1'); // New card, pas due
    expect(dueIds).not.toContain('3'); // Not due
  });

  it('identifie la carte boss (plus de lapses)', () => {
    // Simule la logique boss : la carte avec le plus de lapses doit être dans les candidates
    const bossCard = cards.find(c => c.lapses === 3);
    expect(bossCard).toBeDefined();
    const due = fsrsEngine.getCardsToReview(cards);
    expect(due.find(c => c.id === bossCard!.id)).toBeDefined();
  });
}); 