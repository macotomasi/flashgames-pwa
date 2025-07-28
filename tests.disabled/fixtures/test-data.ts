export const testDeck = {
  name: 'Test Deck E2E',
  description: 'Deck de test automatisé',
  icon: '🧪',
  cards: [
    { front: 'Question Test 1', back: 'Réponse Test 1' },
    { front: 'Question Test 2', back: 'Réponse Test 2' },
    { front: 'Question Test 3', back: 'Réponse Test 3' },
    { front: 'Question Test 4', back: 'Réponse Test 4' },
    { front: 'Question Test 5', back: 'Réponse Test 5' },
  ]
};

export const bossDeck = {
  name: 'Boss Test Deck',
  description: 'Deck pour tester les cartes boss',
  icon: '👹',
  cards: [
    { front: 'Boss Question 1', back: 'Boss Answer 1' },
    { front: 'Boss Question 2', back: 'Boss Answer 2' },
    { front: 'Boss Question 3', back: 'Boss Answer 3' },
    { front: 'Boss Question 4', back: 'Boss Answer 4' },
    { front: 'Boss Question 5', back: 'Boss Answer 5' },
    { front: 'Boss Question 6', back: 'Boss Answer 6' },
    { front: 'Boss Question 7', back: 'Boss Answer 7' },
    { front: 'Boss Question 8', back: 'Boss Answer 8' },
  ]
};

export const importData = {
  version: "1.0",
  decks: [
    {
      id: "import-deck-1",
      name: "Imported Deck 1",
      description: "First imported deck",
      icon: "📚",
      cards: [
        {
          id: "card-1",
          front: "Imported Question 1",
          back: "Imported Answer 1",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: "card-2",
          front: "Imported Question 2",
          back: "Imported Answer 2",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ]
    },
    {
      id: "import-deck-2",
      name: "Imported Deck 2",
      description: "Second imported deck",
      icon: "🌍",
      cards: [
        {
          id: "card-3",
          front: "Imported Question 3",
          back: "Imported Answer 3",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ]
    }
  ]
};

export const gameSettings = {
  tetris: {
    dropKey: ' ',
    leftKey: 'ArrowLeft',
    rightKey: 'ArrowRight',
    rotateKey: 'ArrowUp',
    pauseKey: 'p'
  },
  spaceInvaders: {
    shootKey: ' ',
    leftKey: 'ArrowLeft',
    rightKey: 'ArrowRight',
    upKey: 'ArrowUp',
    downKey: 'ArrowDown',
    pauseKey: 'p'
  }
};

export const progressionLevels = [
  { name: 'Ver', requiredCards: 0 },
  { name: 'Escargot', requiredCards: 10 },
  { name: 'Souris', requiredCards: 30 },
  { name: 'Lapin', requiredCards: 75 },
  { name: 'Chat', requiredCards: 150 },
  { name: 'Chien', requiredCards: 300 },
  { name: 'Cheval', requiredCards: 500 },
  { name: 'Éléphant', requiredCards: 1000 },
  { name: 'Baleine', requiredCards: 2000 }
];

export const dailyRewards = [
  { name: 'Étincelle', requiredNewCards: 1 },
  { name: 'Flamme', requiredNewCards: 3 },
  { name: 'Feu', requiredNewCards: 5 },
  { name: 'Étoile', requiredNewCards: 10 },
  { name: 'Comète', requiredNewCards: 15 },
  { name: 'Galaxie', requiredNewCards: 25 }
];