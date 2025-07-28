/**
 * Script de nettoyage pour ne garder que le deck "Anglais"
 */

import { db } from '../services/db';
import { logger } from './logger';

export async function cleanupDecksKeepOnlyAnglais() {
  try {
    logger.info('🧹 Nettoyage des decks...');
    
    // Récupérer tous les decks
    const allDecks = await db.decks.toArray();
    logger.info(`📦 ${allDecks.length} decks trouvés`);
    
    // Trouver le deck "Anglais" (insensible à la casse)
    const anglaisDeck = allDecks.find(deck => 
      deck.name.toLowerCase() === 'anglais' || 
      deck.name.toLowerCase().includes('anglais')
    );
    
    if (!anglaisDeck) {
      logger.warn('⚠️ Aucun deck "Anglais" trouvé');
      return;
    }
    
    logger.info(`✅ Deck "Anglais" trouvé : ${anglaisDeck.name} (ID: ${anglaisDeck.id})`);
    
    // Supprimer toutes les cartes qui ne sont pas dans le deck Anglais
    const cardsToDelete = await db.cards
      .where('deckId')
      .notEqual(anglaisDeck.id)
      .toArray();
    
    logger.info(`🗑️ Suppression de ${cardsToDelete.length} cartes...`);
    
    const cardIdsToDelete = cardsToDelete.map(card => card.id);
    await db.cards.bulkDelete(cardIdsToDelete);
    
    // Supprimer tous les decks sauf Anglais
    const decksToDelete = allDecks
      .filter(deck => deck.id !== anglaisDeck.id)
      .map(deck => deck.id);
    
    logger.info(`🗑️ Suppression de ${decksToDelete.length} decks...`);
    await db.decks.bulkDelete(decksToDelete);
    
    // Mettre à jour les compteurs du deck Anglais
    const remainingCards = await db.cards
      .where('deckId')
      .equals(anglaisDeck.id)
      .toArray();
    
    const now = new Date().getTime(); // S'assurer que now est un number (timestamp)
    const newCards = remainingCards.filter(card => card.state === 0).length;
    const overdueCards = remainingCards.filter(card => 
      card.state !== 0 && card.nextReview && card.nextReview <= now
    ).length;
    
    await db.decks.update(anglaisDeck.id, {
      overdueCards
    });
    
    logger.info('✅ Nettoyage terminé !');
  } catch (error) {
    logger.error('Erreur lors du nettoyage des decks :', { error });
  }
}