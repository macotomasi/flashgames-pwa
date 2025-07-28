/**
 * Implémentation de l'algorithme Fisher-Yates pour un mélange équitable
 * Remplace l'utilisation de .sort(() => Math.random() - 0.5) qui est biaisée
 */
export function fisherYatesShuffle<T>(array: T[]): T[] {
  // Crée une copie pour éviter les mutations
  const shuffled = [...array];
  
  for (let i = shuffled.length - 1; i > 0; i--) {
    // Génère un index aléatoire entre 0 et i (inclus)
    const randomIndex = Math.floor(Math.random() * (i + 1));
    
    // Échange les éléments
    [shuffled[i], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[i]];
  }
  
  return shuffled;
}

/**
 * Fonction helper pour mélanger un tableau en place (mute l'original)
 */
export function shuffleInPlace<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const randomIndex = Math.floor(Math.random() * (i + 1));
    [array[i], array[randomIndex]] = [array[randomIndex], array[i]];
  }
  
  return array;
}

/**
 * Prend N éléments aléatoires d'un tableau sans répétition
 */
export function takeRandomElements<T>(array: T[], count: number): T[] {
  if (count >= array.length) {
    return fisherYatesShuffle(array);
  }
  
  const shuffled = fisherYatesShuffle(array);
  return shuffled.slice(0, count);
}

/**
 * Mélange un tableau avec une graine pour des résultats reproductibles
 * Utile pour les tests ou quand on veut un mélange déterministe
 */
export function seededShuffle<T>(array: T[], seed: number): T[] {
  const shuffled = [...array];
  
  // Générateur de nombres pseudo-aléatoires simple basé sur une graine
  let currentSeed = seed;
  const random = () => {
    currentSeed = (currentSeed * 1664525 + 1013904223) % Math.pow(2, 32);
    return currentSeed / Math.pow(2, 32);
  };
  
  for (let i = shuffled.length - 1; i > 0; i--) {
    const randomIndex = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[i]];
  }
  
  return shuffled;
}