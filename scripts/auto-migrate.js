/**
 * Script de migration automatique Firebase → IndexedDB
 * Lance l'import directement sans interface
 */

const fs = require('fs').promises;
const path = require('path');

async function autoMigrate() {
  console.log('🚀 Lancement de la migration automatique...\n');
  
  try {
    // Lire le fichier d'export
    const exportPath = path.join(__dirname, 'firebase-export.json');
    const data = await fs.readFile(exportPath, 'utf8');
    const exportData = JSON.parse(data);
    
    console.log('📊 Données à migrer :');
    console.log(`  - ${exportData.flashcards.length} flashcards`);
    console.log(`  - ${exportData.gameStats?.length || 0} statistiques de jeu`);
    console.log(`  - Date d'export : ${exportData.exportDate}\n`);
    
    // Créer un fichier HTML temporaire pour lancer l'import
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <title>Migration automatique</title>
  <meta charset="UTF-8">
</head>
<body>
  <h1>Migration automatique en cours...</h1>
  <div id="status"></div>
  
  <script type="module">
    // Import direct des données dans IndexedDB
    import { db } from '../src/services/db.ts';
    
    const data = ${JSON.stringify(exportData)};
    const status = document.getElementById('status');
    
    async function migrate() {
      try {
        status.innerHTML = '<p>🔄 Import en cours...</p>';
        
        // Générer un UUID simple
        const generateUUID = () => {
          return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
          });
        };
        
        // Convertir les timestamps Firebase
        const convertTimestamp = (date) => {
          if (!date) return undefined;
          if (typeof date === 'object' && '_seconds' in date) {
            return new Date(date._seconds * 1000 + Math.floor(date._nanoseconds / 1000000));
          }
          return new Date(date);
        };
        
        // Créer le deck d'import
        const importDeckId = generateUUID();
        const importDeck = {
          id: importDeckId,
          name: 'Import Firebase - ' + new Date().toLocaleDateString(),
          description: data.flashcards.length + ' cartes importées depuis Firebase',
          color: '#4F46E5',
          isActive: true,
          totalCards: data.flashcards.length,
          newCards: 0,
          overdueCards: 0,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        await db.decks.put(importDeck);
        status.innerHTML += '<p>✅ Deck créé</p>';
        
        // Import des cartes
        const cards = [];
        let newCardsCount = 0;
        let overdueCardsCount = 0;
        const now = new Date();
        
        for (const flashcard of data.flashcards) {
          const nextReviewDate = convertTimestamp(flashcard.nextReview || flashcard.due);
          const isNew = flashcard.state === 0;
          const isOverdue = !isNew && nextReviewDate && nextReviewDate <= now;
          
          if (isNew) newCardsCount++;
          if (isOverdue) overdueCardsCount++;
          
          cards.push({
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
            lastReview: flashcard.lastReview ? convertTimestamp(flashcard.lastReview).getTime() : undefined,
            nextReview: nextReviewDate || new Date(),
            createdAt: convertTimestamp(flashcard.createdAt) || new Date(),
            updatedAt: convertTimestamp(flashcard.updatedAt) || new Date()
          });
        }
        
        await db.cards.bulkPut(cards);
        status.innerHTML += '<p>✅ ' + cards.length + ' cartes importées</p>';
        
        // Mettre à jour les compteurs
        await db.decks.update(importDeckId, {
          newCards: newCardsCount,
          overdueCards: overdueCardsCount
        });
        
        status.innerHTML += '<p>✅ Migration terminée !</p>';
        status.innerHTML += '<p>📦 1 deck créé</p>';
        status.innerHTML += '<p>🃏 ' + cards.length + ' cartes importées</p>';
        status.innerHTML += '<p>  - ' + newCardsCount + ' nouvelles cartes</p>';
        status.innerHTML += '<p>  - ' + overdueCardsCount + ' cartes en retard</p>';
        
        setTimeout(() => {
          window.location.href = '/';
        }, 3000);
        
      } catch (error) {
        status.innerHTML = '<p style="color: red;">❌ Erreur : ' + error.message + '</p>';
        console.error(error);
      }
    }
    
    migrate();
  </script>
</body>
</html>`;
    
    // Sauvegarder le fichier HTML
    const htmlPath = path.join(__dirname, '..', 'migrate.html');
    await fs.writeFile(htmlPath, htmlContent);
    
    console.log('✅ Fichier de migration créé');
    console.log('\n📝 Instructions :');
    console.log('1. Assurez-vous que votre serveur de développement est lancé (npm run dev)');
    console.log('2. Ouvrez dans votre navigateur : http://localhost:5173/migrate.html');
    console.log('3. La migration se lancera automatiquement');
    console.log('4. Vous serez redirigé vers la page d\'accueil une fois terminé');
    
  } catch (error) {
    console.error('❌ Erreur :', error);
  }
}

autoMigrate();