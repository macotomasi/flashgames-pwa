/**
 * Script pour filtrer uniquement les cartes anglaises du fichier d'export
 */

const fs = require('fs').promises;
const path = require('path');

async function filterEnglishCards() {
  try {
    console.log('🔍 Filtrage des cartes anglaises...');
    
    // Lire le fichier d'export complet
    const exportPath = path.join(__dirname, 'firebase-export.json');
    const data = await fs.readFile(exportPath, 'utf8');
    const exportData = JSON.parse(data);
    
    console.log(`📊 Données originales : ${exportData.flashcards.length} flashcards`);
    
    // Liste de mots-clés pour identifier les cartes anglaises
    const englishKeywords = [
      'english', 'anglais', 'vocabulary', 'grammar', 'verb', 'noun',
      'adjective', 'phrasal', 'idiom', 'tense', 'pronunciation'
    ];
    
    // Filtrer les cartes qui semblent être en anglais
    const englishCards = exportData.flashcards.filter(card => {
      const text = (card.question + ' ' + card.answer).toLowerCase();
      
      // Vérifier si la carte contient des mots-clés anglais
      const hasEnglishKeyword = englishKeywords.some(keyword => text.includes(keyword));
      
      // Vérifier si la carte contient beaucoup de texte en anglais (lettres ASCII sans accents)
      const englishPattern = /^[a-zA-Z0-9\s.,!?'-]+$/;
      const hasEnglishText = englishPattern.test(card.answer) || englishPattern.test(card.question);
      
      // Exclure les cartes qui semblent être en français uniquement
      const frenchAccents = /[àâäéèêëïîôùûüÿæœç]/i;
      const hasFrenchAccents = frenchAccents.test(card.question) && frenchAccents.test(card.answer);
      
      return hasEnglishKeyword || (hasEnglishText && !hasFrenchAccents);
    });
    
    console.log(`✅ ${englishCards.length} cartes anglaises trouvées`);
    
    // Créer un nouveau fichier avec seulement les cartes anglaises
    const filteredData = {
      ...exportData,
      flashcards: englishCards
    };
    
    const outputPath = path.join(__dirname, 'firebase-export-english-only.json');
    await fs.writeFile(outputPath, JSON.stringify(filteredData, null, 2));
    
    console.log(`📁 Fichier filtré sauvegardé : ${outputPath}`);
    
    // Afficher quelques exemples
    console.log('\n📝 Exemples de cartes conservées :');
    englishCards.slice(0, 5).forEach((card, i) => {
      console.log(`${i + 1}. Q: ${card.question.substring(0, 50)}...`);
      console.log(`   R: ${card.answer.substring(0, 50)}...`);
    });
    
  } catch (error) {
    console.error('❌ Erreur :', error);
  }
}

filterEnglishCards();