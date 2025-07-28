import React, { useState } from 'react';
import { importFirebaseData } from '../../utils/import-firebase-to-dexie';
import { useDeckStore } from '../../store/deck.store';

export const ImportFirebaseData: React.FC = () => {
  const [isImporting, setIsImporting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const loadDecks = useDeckStore(state => state.loadDecks);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      setMessage({ type: 'error', text: 'Veuillez sélectionner un fichier JSON' });
      return;
    }

    setIsImporting(true);
    setMessage({ type: 'info', text: 'Import en cours...' });

    try {
      await importFirebaseData(file);
      
      // Recharger les decks
      await loadDecks();
      
      setMessage({ type: 'success', text: 'Import terminé avec succès !' });
      
      // Reset le champ file
      event.target.value = '';
      
    } catch (err) {
      setMessage({ 
        type: 'error', 
        text: err instanceof Error ? err.message : 'Erreur lors de l\'import' 
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">Import depuis Firebase</h3>
      
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          Importez vos flashcards depuis une sauvegarde Firebase.
        </p>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Fichier d'export Firebase (JSON)
          </label>
          <input
            type="file"
            accept=".json"
            onChange={handleFileSelect}
            disabled={isImporting}
            className="block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-full file:border-0
              file:text-sm file:font-semibold
              file:bg-indigo-50 file:text-indigo-700
              hover:file:bg-indigo-100
              disabled:opacity-50"
          />
        </div>

        {message && (
          <div className={`p-4 rounded-md ${
            message.type === 'success' ? 'bg-green-50 text-green-800' :
            message.type === 'error' ? 'bg-red-50 text-red-800' :
            'bg-blue-50 text-blue-800'
          }`}>
            {message.text}
          </div>
        )}

        <div className="text-xs text-gray-500 space-y-1">
          <p>⚠️ Cette opération créera un nouveau deck avec toutes vos cartes importées.</p>
          <p>💡 Vous pourrez réorganiser les cartes dans différents decks après l'import.</p>
        </div>
      </div>
    </div>
  );
};