/**
 * Script d'import des données Firebase vers IndexedDB/Dexie
 * À exécuter dans l'application pour migrer les données
 */

import { db } from '../src/services/db';
import type { Deck, Card, ReviewLog } from '../src/types';

interface FirebaseExportData {
  decks: Array<{
    id: string;
    name: string;
    description: string;
    color: string;
    isActive: boolean;
    createdAt: string | Date;
    updatedAt: string | Date;
  }>;
  cards: Array<{
    id: string;
    deckId: string;
    front: string;
    back: string;
    state: number;
    difficulty: number;
    stability: number;
    retrievability: number;
    lastReview: string | Date | null;
    nextReview: string | Date;
    reps: number;
    lapses: number;
    createdAt: string | Date;
    updatedAt: string | Date;
  }>;
  reviewLogs: Array<{
    id: string;
    cardId: string;
    rating: number;
    state: number;
    lastState: number;
    difficulty: number;
    stability: number;
    retrievability: number;
    nextReview: string | Date;
    reviewedAt: string | Date;
    responseTime: number;
  }>;
  exportDate: string;
}

export class FirebaseToIndexedDBMigrator {
  
  async importFromFile(file: File): Promise<void> {
    console.log('🔄 Début de l\'import...');
    
    try {
      const text = await file.text();
      const data: FirebaseExportData = JSON.parse(text);
      
      await this.validateData(data);
      await this.importData(data);
      
      console.log('✅ Import terminé avec succès !');
    } catch (error) {
      console.error('❌ Erreur lors de l\'import :', error);
      throw error;
    }
  }
  
  async importFromData(data: FirebaseExportData): Promise<void> {
    console.log('🔄 Début de l\'import des données...');
    
    try {
      await this.validateData(data);
      await this.importData(data);
      
      console.log('✅ Import terminé avec succès !');
    } catch (error) {
      console.error('❌ Erreur lors de l\'import :', error);
      throw error;
    }
  }

  private async validateData(data: FirebaseExportData): Promise<void> {
    if (!data.decks || !data.cards || !data.reviewLogs) {
      throw new Error('Données incomplètes : decks, cards et reviewLogs requis');
    }
    
    console.log(`📊 Validation des données :`);
    console.log(`  - ${data.decks.length} decks`);
    console.log(`  - ${data.cards.length} cartes`);
    console.log(`  - ${data.reviewLogs.length} logs de révision`);
  }

  private async importData(data: FirebaseExportData): Promise<void> {
    // Vider les tables existantes (optionnel)
    const clearExisting = confirm('Voulez-vous vider les données existantes avant l\'import ?');
    if (clearExisting) {
      await this.clearExistingData();
    }

    // Import des decks
    console.log('📦 Import des decks...');
    const decks: Deck[] = data.decks.map(deck => ({
      id: deck.id,
      name: deck.name,
      description: deck.description,
      color: deck.color,
      isActive: deck.isActive,
      totalCards: 0, // Sera calculé automatiquement
      newCards: 0,
      overdueCards: 0,
      createdAt: this.parseDate(deck.createdAt),
      updatedAt: this.parseDate(deck.updatedAt)
    }));
    
    await db.decks.bulkPut(decks);
    console.log(`✅ ${decks.length} decks importés`);

    // Import des cartes
    console.log('🃏 Import des cartes...');
    const cards: Card[] = data.cards.map(card => ({
      id: card.id,
      deckId: card.deckId,
      front: card.front,
      back: card.back,
      state: card.state,
      difficulty: card.difficulty,
      stability: card.stability,
      retrievability: card.retrievability,
      lastReview: card.lastReview ? this.parseDate(card.lastReview) : undefined,
      nextReview: this.parseDate(card.nextReview),
      reps: card.reps,
      lapses: card.lapses,
      createdAt: this.parseDate(card.createdAt),
      updatedAt: this.parseDate(card.updatedAt)
    }));
    
    await db.cards.bulkPut(cards);
    console.log(`✅ ${cards.length} cartes importées`);

    // Import des logs de révision
    console.log('📊 Import des logs de révision...');
    const reviewLogs: ReviewLog[] = data.reviewLogs.map(log => ({
      id: log.id,
      cardId: log.cardId,
      rating: log.rating,
      state: log.state,
      lastState: log.lastState,
      difficulty: log.difficulty,
      stability: log.stability,
      retrievability: log.retrievability,
      nextReview: this.parseDate(log.nextReview),
      reviewedAt: this.parseDate(log.reviewedAt),
      responseTime: log.responseTime
    }));
    
    await db.reviewLogs.bulkPut(reviewLogs);
    console.log(`✅ ${reviewLogs.length} logs importés`);

    // Mise à jour des compteurs de cartes
    console.log('🔄 Mise à jour des compteurs...');
    await this.updateDeckCounters();
  }

  private async clearExistingData(): Promise<void> {
    console.log('🗑️ Suppression des données existantes...');
    await db.reviewLogs.clear();
    await db.cards.clear();
    await db.decks.clear();
    console.log('✅ Données existantes supprimées');
  }

  private parseDate(date: string | Date): Date {
    if (date instanceof Date) {
      return date;
    }
    return new Date(date);
  }

  private async updateDeckCounters(): Promise<void> {
    const allDecks = await db.decks.toArray();
    const now = new Date();
    
    for (const deck of allDecks) {
      const cards = await db.cards.where('deckId').equals(deck.id).toArray();
      
      const totalCards = cards.length;
      const newCards = cards.filter(card => card.state === 0).length; // New state
      const overdueCards = cards.filter(card => 
        card.nextReview && card.nextReview <= now && card.state !== 0
      ).length;
      
      await db.decks.update(deck.id, {
        totalCards,
        newCards,
        overdueCards
      });
    }
    
    console.log('✅ Compteurs mis à jour');
  }
}

// Fonction utilitaire pour l'import depuis l'interface
export async function importFirebaseData(file: File): Promise<void> {
  const migrator = new FirebaseToIndexedDBMigrator();
  await migrator.importFromFile(file);
}

// Fonction pour import direct avec données
export async function importFirebaseDataDirect(data: FirebaseExportData): Promise<void> {
  const migrator = new FirebaseToIndexedDBMigrator();
  await migrator.importFromData(data);
}