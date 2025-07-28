# Maintenance & Audit FlashGames-PWA

## Procédure de mise à jour des dépendances

1. **Vérifier les dépendances critiques**
   - Lancer `npm outdated` pour voir les versions disponibles.
   - Lancer `npm audit` pour détecter les vulnérabilités.

2. **Mettre à jour dans l’ordre**
   - D’abord Vite et vite-plugin-pwa (et leurs peerDependencies).
   - Puis les autres plugins critiques (React, Zustand, etc.).
   - Enfin les dépendances secondaires.

3. **Après chaque mise à jour**
   - Lancer `npm run dev` et vérifier le fonctionnement local.
   - Lancer `ouinpm run build` et vérifier le build de production.
   - Tester la PWA sur desktop et mobile (offline, installation, icône, splash, etc.).
   - Jouer à chaque jeu (Tetris, Space Invaders) pour vérifier la stabilité.
   - Vérifier la compatibilité sur Chrome, Firefox, Safari, Edge.

4. **Sécurité**
   - Ne jamais exposer le serveur de développement à Internet/public.
   - Lire les rapports `npm audit` et corriger les vulnérabilités critiques.

5. **Automatisation**
   - Utiliser le script suivant dans le `package.json` :
     ```json
     "scripts": {
       // ... autres scripts ...
       "audit": "npm audit && npm outdated",
       "check": "npm run lint && npm run type-check && npm run audit"
     }
     ```
   - Lancer `npm run check` avant chaque release.

6. **Documentation**
   - Mettre à jour la checklist `AUDIT_CHECKLIST.md` à chaque release.
   - Documenter toute limitation ou bug connu dans le README.

7. **Surveillance**
   - S’abonner aux issues GitHub de Vite, vite-plugin-pwa, esbuild.
   - Lire les release notes avant chaque upgrade majeur.

---

**À relire et compléter à chaque release majeure ou migration de dépendances.** 