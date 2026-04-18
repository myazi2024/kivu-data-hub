
## Audit — Menu / Page Accueil

### Périmètre

| Bloc | Fichier | LOC | État |
|---|---|---|---|
| Page racine | `src/pages/Index.tsx` | 26 | OK |
| Hero | `src/components/HeroSection.tsx` | 95 | OK fonctionnel — issues UX |
| Typewriter | `src/components/TypewriterAnimation.tsx` | 72 | OK — phrases en dur |
| Partenaires | `src/components/PartnersSection.tsx` | 87 | Issues perf + a11y |
| Footer | `src/components/Footer.tsx` | 128 | OK — liens incomplets |
| Navigation (lien depuis accueil) | `src/components/ui/navigation.tsx` | 320 | Audité dans Lot précédent |

---

### Lot 1 — Bugs / cohérence (haute priorité)

1. **CTA "Cadastre numérique" mal ciblé pour visiteur non connecté.** `/cadastral-map` est `<ProtectedRoute>`. Un visiteur arrive sur la page d'auth sans contexte. → Ajouter `redirect=/cadastral-map` dans le lien `/auth?redirect=...` quand `!user`, ou afficher un message contextuel.
2. **CTA "Media" pointe vers `/articles` seul.** Or "Media" dans la nav couvre 8 pages (Articles, Services, Pitch, Codes Promo, Contributions CCC, Le BIC, Partenariat, Mentions). Incohérent. → Renommer le bouton "Articles" ou créer une page index `/media`.
3. **`PartnersSection` ne respecte pas `isTestRoute`.** Les autres listes filtrent `TEST-%` selon le contexte. À aligner ou documenter "table publique".
4. **Cast `(supabase as any)` dans `PartnersSection`** : la table `partners` existe en migration mais pas dans `types.ts`. → Régénérer types et retirer le cast.
5. **`Helmet` est utilisé** alors que le projet utilise `react-helmet-async` ailleurs (à vérifier). Si non installé proprement, double `<title>` possible. → Standardiser sur `react-helmet-async` + `<HelmetProvider>`.
6. **Footer "Publications" mort** : la route `/publications` existe mais le menu Media n'y renvoie pas → soit l'ajouter dans Media, soit retirer du Footer (incohérence).

### Lot 2 — Performance & SEO

7. **Pas de `<link rel="preload" as="image">` sur `heroImage`.** L'image est `loading="eager"` mais bloquante pour le LCP. → Préload via Helmet + servir AVIF/WebP responsive (`srcset`) en plus du WebP unique actuel.
8. **`PartnersSection` re-fetch à chaque mount** sans cache. → Migrer vers `useQuery` (`['partners','active']`, staleTime 5 min).
9. **Marquee dupliqué côté JSX** (`[...partners, ...partners]`) — OK mais sans `aria-hidden` sur le clone → lecteurs d'écran lisent 2× chaque partenaire. À corriger.
10. **`animate-marquee` sans `prefers-reduced-motion`.** Ajouter `@media (prefers-reduced-motion: reduce) { .animate-marquee { animation: none; } }`.
11. **SEO Helmet minimal** : pas d'`og:image`, `og:url`, `twitter:card`, JSON-LD `Organization`. → Ajouter pour partage social.
12. **`<h1>` long et dynamique** sans fallback SSR — pas de souci ici, mais la phrase typewriter est dans un `<p>` et la `min-h` bouge sur petit écran (`min-h-[3rem]` à 360px). Texte plus long → 2-3 lignes. À vérifier.

### Lot 3 — UX / contenu / a11y

13. **Phrases typewriter codées en dur** dans `TypewriterAnimation.tsx`. → Lire depuis `app_appearance_config` (clé `hero_phrases`) pour pilotage admin.
14. **3 CTA de même poids visuel** : un primaire + deux outline serait plus clair. Aujourd'hui le primaire (Cadastre) écrase les deux autres. Sur mobile (360 px observé), les 3 boutons empilés font scroller le hero entier sous la pliure. → Limiter à 2 CTA principaux + un lien texte secondaire.
15. **`<TypewriterAnimation>` ne respecte pas `prefers-reduced-motion`** (curseur clignotant + frappe). À gater.
16. **`provinces.join(', ')`** sans wrap géré → liste longue déborde sur mobile (à confirmer visuellement).
17. **Footer répète le logo 2 fois** (header + bottom bar). Mineur, mais bruit visuel.
18. **Liens Footer**: "Publications" présent mais pas "Articles" alors que c'est l'entrée Media #1. À harmoniser.
19. **Bouton "Gérer les cookies"** OK, mais "26 provinces" est un badge statique alors que `provinces.length` est dynamique côté hero. → Brancher sur la même source.

### Lot 4 — Architecture / observabilité

20. **Pas de tracking analytics** sur les CTA hero (clic Cadastre / Media / Données). → Ajouter event `hero_cta_click` (id du bouton) via le helper analytics existant.
21. **Aucun test e2e/storybook** pour le hero. Optionnel.

---

### Question pour cadrage

Quel périmètre veux-tu que j'implémente ?

- **(A) Lot 1 seul** — fixe redirect auth, cohérence CTA Media, types `partners`, doublons SEO. Rapide.
- **(B) Lots 1 + 2** — + perf LCP (preload + responsive image), `useQuery` partners, `prefers-reduced-motion`, og/twitter/JSON-LD.
- **(C) Plan complet 1+2+3+4** — + phrases typewriter pilotables admin, refonte CTA mobile, harmonisation Footer/Nav, tracking analytics CTA.
