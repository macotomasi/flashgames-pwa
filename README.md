# FlashGames PWA 🎮

> Apprenez en jouant avec des flashcards gamifiées

## Description

FlashGames PWA est une application web progressive qui combine l'apprentissage par flashcards avec des jeux vidéo classiques. Apprenez vos cartes mémoire tout en jouant à Tetris, Space Invaders et plus !

## Fonctionnalités

- 🎮 **Jeux intégrés** : Tetris, Space Invaders
- 🃏 **Système de flashcards** avec algorithme FSRS
- 📱 **PWA complète** installable sur mobile et desktop
- 🏆 **Système de progression** avec niveaux et récompenses
- 📊 **Statistiques détaillées** de révision
- 🌙 **Interface sombre** style arcade/gaming
- 📱 **Support mobile** avec contrôles tactiles

## Installation

```bash
npm install
npm run dev
```

## Build pour production

```bash
npm run build
npm run preview
```

## Technologies

- **Frontend** : React 19, TypeScript, Tailwind CSS
- **Build** : Vite avec plugin PWA
- **État** : Zustand
- **Base de données** : IndexedDB via Dexie
- **PWA** : Service Workers, Manifest, Cache API

## Structure

```
src/
├── components/          # Composants React
├── modules/            # Logique métier (jeux, flashcards)
├── store/              # Gestion d'état Zustand
├── utils/              # Utilitaires
└── types/              # Types TypeScript
```

## Licence

MIT