/**
 * Import automatique des données Firebase au premier lancement
 */

import { db } from '../services/db';
import type { Deck, Card } from '../types';
// Import dynamique pour ne pas ralentir le démarrage
// import firebaseData from '../../scripts/firebase-export.json';

// Génération simple d'UUID
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

// Convertir les timestamps Firebase
const convertTimestamp = (date: string | FirebaseTimestamp | null | undefined): number | undefined => {
  if (!date) return undefined;
  
  if (typeof date === 'object' && '_seconds' in date) {
    return date._seconds * 1000 + Math.floor(date._nanoseconds / 1000000);
  }
  
  return new Date(date).getTime();
};

const convertToNumber = (date: string | FirebaseTimestamp | null | undefined): number | undefined => {
  const converted = convertTimestamp(date);
  return converted ? converted : undefined;
};

export async function checkAndRunAutoImport() {
  try {
    // Vérifier si l'import a déjà été fait
    const migrationKey = 'firebase-migration-done';
    if (localStorage.getItem(migrationKey)) {
      return;
    }

    // Vérifier s'il y a déjà des decks
    const existingDecks = await db.decks.count();
    if (existingDecks > 0) {
      return;
    }

    // Import dynamique du fichier JSON pour ne pas ralentir le démarrage
    const firebaseData = await import('../../scripts/firebase-export.json');

    // Créer le deck d'import
    const importDeckId = generateUUID();
    const importDeck: Deck = {
      id: importDeckId,
      name: 'Mes Flashcards',
      description: `${firebaseData.flashcards.length} cartes importées depuis Firebase`,
      createdAt: new Date().getTime(),
      updatedAt: new Date().getTime(),
      cardCount: 0,
      dueCount: 0,
      newCount: 0
    };
    
    await db.decks.put(importDeck);

    // Import des cartes
    const cards: Card[] = [];
    let newCardsCount = 0;
    let overdueCardsCount = 0;
    const now = new Date();

    for (const flashcard of firebaseData.flashcards) {
      const nextReviewDate = convertTimestamp(flashcard.nextReview || flashcard.due);
      const isNew = flashcard.state === 0;
      const isOverdue = !isNew && nextReviewDate && nextReviewDate <= now.getTime();

      if (isNew) newCardsCount++;
      if (isOverdue) overdueCardsCount++;

      const card: Card = {
        id: generateUUID(),
        deckId: importDeckId,
        front: flashcard.question,
        back: flashcard.answer,
        state: flashcard.state,
        difficulty: flashcard.difficulty || 0,
        stability: flashcard.stability || 0,
        elapsedDays: 0,
        scheduledDays: 0,
        reps: flashcard.reps,
        lapses: flashcard.lapses,
        lastReview: convertToNumber(flashcard.lastReview),
        nextReview: nextReviewDate || new Date().getTime(),
        createdAt: convertTimestamp(flashcard.createdAt) || new Date().getTime(),
        updatedAt: convertTimestamp(flashcard.updatedAt) || new Date().getTime()
      };
      
      cards.push(card);
    }
    
    await db.cards.bulkPut(cards);

    // Mettre à jour les compteurs
    await db.decks.update(importDeckId, {
      cardCount: firebaseData.flashcards.length,
      dueCount: overdueCardsCount,
      newCount: newCardsCount
    });

    // Marquer la migration comme effectuée
    localStorage.setItem(migrationKey, 'true');

  } catch (error) {
  }
}