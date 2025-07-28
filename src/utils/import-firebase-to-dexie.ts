/**
 * Script d'import des données Firebase vers IndexedDB/Dexie
 * Adapté à la structure réelle des données Firebase de tetris-flashcards
 */

import { db } from '../services/db';
import type { Deck, Card, GameSession } from '../types';
import { GameType } from '@/types'

// Génération simple d'UUID sans dépendance externe
const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

interface FirebaseTimestamp {
  _seconds: number;
  _nanoseconds: number;
}

interface FirebaseFlashcard {
  id: number | string;
  question: string;
  answer: string;
  due: string | FirebaseTimestamp;
  state: number;
  reps: number;
  lapses: number;
  difficulty?: number;
  stability?: number;
  createdAt: string | FirebaseTimestamp;
  updatedAt: string | FirebaseTimestamp;
  lastReview: string | FirebaseTimestamp | null;
  nextReview: string | FirebaseTimestamp;
}

interface FirebaseGameStats {
  id: string;
  bestScore: number;
  cardStats: Record<string, { correct: number; incorrect: number }>;
  lastUpdated: FirebaseTimestamp;
  createdAt: string;
  updatedAt: string;
  reviewedAt: string;
}

interface FirebaseExportData {
  flashcards: FirebaseFlashcard[];
  gameStats: FirebaseGameStats[];
  exportDate: string;
}

export class FirebaseToIndexedDBMigrator {
  
  private convertTimestamp(date: string | FirebaseTimestamp | null | undefined): number | undefined {
    if (!date) return undefined;
    
    // Si c'est un timestamp Firebase
    if (typeof date === 'object' && '_seconds' in date) {
      return date._seconds * 1000 + Math.floor(date._nanoseconds / 1000000);
    }
    
    // Si c'est une string date
    return new Date(date).getTime();
  }

  private convertToNumber(date: string | FirebaseTimestamp | null | undefined): number | undefined {
    const converted = this.convertTimestamp(date);
    return converted ? converted : undefined;
  }

  async importFromFile(file: File): Promise<void> {
    
    try {
      const text = await file.text();
      const data: FirebaseExportData = JSON.parse(text);
      
      await this.validateData(data);
      await this.importData(data);
      
    } catch (error) {
      throw error;
    }
  }
  
  private async validateData(data: FirebaseExportData): Promise<void> {
    if (!data.flashcards) {
      throw new Error('Données incomplètes : flashcards requis');
    }
    
  }

  private async importData(data: FirebaseExportData): Promise<void> {
    // Demander à l'utilisateur s'il veut vider les données existantes
    const clearExisting = confirm('Voulez-vous vider les données existantes avant l\'import ?');
    if (clearExisting) {
      await this.clearExistingData();
    }

    // Créer un deck pour les cartes importées
    
    const importDeckId = generateUUID();
    // Correction Deck
    const importDeck: Deck = {
      id: importDeckId,
      name: 'Import Firebase - ' + new Date().toLocaleDateString(),
      description: `${data.flashcards.length} cartes importées depuis Firebase`,
      createdAt: new Date().getTime(),
      updatedAt: new Date().getTime(),
      cardCount: 0,
      dueCount: 0,
      newCount: 0
    };
    
    await db.decks.put(importDeck);

    // Import des flashcards
    
    const cards: Card[] = [];
    let newCardsCount = 0;
    let overdueCardsCount = 0;
    const now = new Date().getTime();

    for (const flashcard of data.flashcards) {
      const nextReviewDate = this.convertTimestamp(flashcard.nextReview || flashcard.due);
      const isNew = flashcard.state === 0;
      const isOverdue = !isNew && nextReviewDate && nextReviewDate <= now;

      if (isNew) newCardsCount++;
      if (isOverdue) overdueCardsCount++;

      const card: Card = {
        id: generateUUID(), // Générer un nouvel UUID
        deckId: importDeckId,
        front: flashcard.question,
        back: flashcard.answer,
        state: flashcard.state,
        difficulty: flashcard.difficulty || 0,
        stability: flashcard.stability || 0,
        elapsedDays: 0, // Sera calculé par FSRS
        scheduledDays: 0, // Sera calculé par FSRS
        reps: flashcard.reps,
        lapses: flashcard.lapses,
        lastReview: this.convertToNumber(flashcard.lastReview),
        nextReview: nextReviewDate || new Date().getTime(),
        createdAt: this.convertTimestamp(flashcard.createdAt) || new Date().getTime(),
        updatedAt: this.convertTimestamp(flashcard.updatedAt) || new Date().getTime()
      };
      
      cards.push(card);
    }
    
    await db.cards.bulkPut(cards);

    // Mettre à jour les compteurs du deck sans overdueCards
    await db.decks.update(importDeckId, {
      cardCount: data.flashcards.length,
      dueCount: overdueCardsCount,
      newCount: newCardsCount
    });

    // Import des statistiques de jeu (optionnel)
    if (data.gameStats && data.gameStats.length > 0) {
      
      for (const gameStat of data.gameStats) {
        if (gameStat.bestScore) {
          // Créer une session de jeu pour enregistrer le meilleur score
          // Correction GameSession
          const gameSession: GameSession = {
            gameType: GameType.TETRIS, // ou autre type selon le contexte
            score: gameStat.bestScore,
            linesCleared: 0,
            cardsReviewed: Object.keys(gameStat.cardStats || {}).length,
            startedAt: Date.now()
            // autres propriétés requises par GameSession si besoin
          };
          
          await db.gameSessions.put(gameSession);
        }
      }
    }

  }

  private async clearExistingData(): Promise<void> {
    
    await db.reviewLogs.clear();
    await db.gameSessions.clear();
    await db.cards.clear();
    await db.decks.clear();
  }
}

// Fonction utilitaire pour l'import depuis l'interface
export async function importFirebaseData(file: File): Promise<void> {
  const migrator = new FirebaseToIndexedDBMigrator();
  await migrator.importFromFile(file);
}