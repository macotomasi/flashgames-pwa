# 🎮 FlashGames PWA - État du Projet

## Stack Technique
- React 18 + TypeScript + Vite
- Tailwind CSS
- Dexie (IndexedDB)
- Zustand (state management)
- FSRS Algorithm v4

## Fonctionnalités Implémentées ✅
1. Gestion des decks (CRUD)
2. Gestion des cartes (CRUD)
3. Tetris complet avec intégration flashcards
4. FSRS pour la répétition espacée
5. Système de pénalités/bonus
6. Mode "tous les decks"
7. Mode "plaisir" quand à jour

## Structure Clé
src/
├── components/      # Composants UI
├── modules/         # Logique métier
│   ├── flashcards/  # FSRS engine
│   └── games/       # Tetris et futurs jeux
├── services/        # Base de données
├── store/          # État global Zustand
└── types/          # Types TypeScript

## Prochaines Fonctionnalités (par ordre)
1. Système de progression (Ver → ChatGPT)
2. Badges quotidiens
3. Sons kawaii
4. Statistiques
5. Autres jeux (Pac-Man, etc.)

## Problèmes Connus
- Aucun actuellement

## Commandes Essentielles
```bash
npm run dev        # Lancer le dev
npm run build      # Build production
npm run preview    # Tester le build