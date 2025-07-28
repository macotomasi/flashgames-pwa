/**
 * Script d'export des données Firebase vers JSON
 * Utilise l'Admin SDK Firebase pour récupérer les collections
 */

const admin = require('firebase-admin');
const fs = require('fs').promises;
const path = require('path');

// Configuration Firebase - à adapter selon votre projet
const serviceAccount = require('./firebase-service-account.json'); // Votre clé de service

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: "tetris-flashcards"
});

const db = admin.firestore();

async function exportFirebaseData() {
  console.log('🔄 Début de l\'export Firebase...');
  
  const exportData = {
    flashcards: [],
    gameStats: [],
    exportDate: new Date().toISOString()
  };

  try {
    // Export des flashcards
    console.log('🃏 Export des flashcards...');
    const flashcardsSnapshot = await db.collection('flashcards').get();
    for (const doc of flashcardsSnapshot.docs) {
      const data = doc.data();
      exportData.flashcards.push({
        id: doc.id,
        ...data, // Garde tous les champs tels quels
        // Conversion des timestamps Firebase
        createdAt: data.createdAt?.toDate?.() || new Date(),
        updatedAt: data.updatedAt?.toDate?.() || new Date(),
        lastReview: data.lastReview?.toDate?.() || null,
        nextReview: data.nextReview?.toDate?.() || new Date()
      });
    }

    // Export des gameStats
    console.log('📊 Export des gameStats...');
    const gameStatsSnapshot = await db.collection('gameStats').get();
    for (const doc of gameStatsSnapshot.docs) {
      const data = doc.data();
      exportData.gameStats.push({
        id: doc.id,
        ...data, // Garde tous les champs tels quels
        // Conversion des timestamps Firebase
        createdAt: data.createdAt?.toDate?.() || new Date(),
        updatedAt: data.updatedAt?.toDate?.() || new Date(),
        reviewedAt: data.reviewedAt?.toDate?.() || new Date()
      });
    }

    // Sauvegarde du fichier JSON
    const outputPath = path.join(__dirname, 'firebase-export.json');
    await fs.writeFile(outputPath, JSON.stringify(exportData, null, 2));
    
    console.log('✅ Export terminé !');
    console.log(`📁 Fichier sauvegardé : ${outputPath}`);
    console.log(`🃏 ${exportData.flashcards.length} flashcards exportées`);
    console.log(`📊 ${exportData.gameStats.length} gameStats exportées`);

  } catch (error) {
    console.error('❌ Erreur lors de l\'export :', error);
  } finally {
    admin.app().delete();
  }
}

// Lancement du script
exportFirebaseData();