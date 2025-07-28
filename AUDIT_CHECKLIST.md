# Audit Checklist FlashGames-PWA

## 1. Sécurité (dev server, dépendances, vulnérabilités)
- [ ] Vite/dev server accessible uniquement sur localhost ou réseau privé
- [ ] Aucun proxy ou exposition publique non voulue
- [ ] Test d’accès au serveur depuis un autre appareil du réseau local
- [ ] Rapport `npm audit` lu et compris
- [ ] Aucune vulnérabilité “high” ou “critical” ignorée en prod
- [ ] Documentation des versions minimales sûres dans le README
- [ ] Service worker PWA vérifié (pas d’accès non autorisé)

## 2. Compatibilité et gestion des dépendances
- [ ] Liste des dépendances critiques à jour (Vite, vite-plugin-pwa, esbuild, React, Zustand…)
- [ ] Vérification des peerDependencies et release notes des plugins
- [ ] Script de CI pour `npm audit` et `npm outdated`
- [ ] Procédure de mise à jour documentée (ordre, tests à faire)
- [ ] Tests manuels après chaque upgrade/downgrade :
  - [ ] `npm run dev`
  - [ ] `npm run build`
  - [ ] Fonctionnalités critiques (PWA, HMR, build, etc.)

## 3. Stabilité et performance du code
- [ ] Tous les `console.log` et badges DEBUG supprimés
- [ ] Profiler React utilisé pour détecter les re-rendus inutiles
- [ ] Utilisation de `React.memo`, `useMemo`, `useCallback` sur les composants critiques
- [ ] Tous les timers/listeners nettoyés dans les `useEffect`
- [ ] Jeu testé sans mode debug (plusieurs parties complètes)
- [ ] Gestion des erreurs testée (feedback utilisateur en cas de bug)
- [ ] Aucun crash, lag ou bug d’UI détecté

## 4. Tests et portabilité (UI, CSS, PWA, multi-device)
- [ ] Responsive et CSS vérifiés sur desktop, tablette, mobile
- [ ] Canvas limité à 800px, pas de débordement
- [ ] PWA installée/testée sur mobile (offline, icône, splash, etc.)
- [ ] Compatibilité navigateur testée (Chrome, Firefox, Safari, Edge)
- [ ] `npm run dev` et `npm run build` testés sur chaque environnement cible

## 5. Documentation, automatisation et maintenance
- [ ] Procédure de mise à jour des dépendances documentée
- [ ] Script d’audit automatisé (lint, audit, build, test e2e) en place
- [ ] Points de vigilance et limitations documentés
- [ ] Surveillance des issues GitHub des plugins critiques (Vite, vite-plugin-pwa, esbuild)

---

**À cocher à chaque release ou après chaque grosse mise à jour.** 