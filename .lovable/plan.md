

## Remplacer "Copier" par "Partager" — Carte RDC + Analytics

### Périmètre

| Composant | Bouton(s) concerné(s) | Source |
|---|---|---|
| `DRCInteractiveMap.tsx` | 1 bouton "Copier en image" sur la carte | ligne 508-519 |
| `ChartCard.tsx` | `CopyButton` partagé par tous les graphiques (`ChartCard` + `StackedBarCard`) — utilisé dans les onglets analytics intégrés à la carte (territorial, dashboards visualisations) | lignes 216-224, 312, 421 |

Ces deux composants sont les **seuls** points qui exposent un bouton "Copier" dans le menu **Données foncières** (`/map`) et ses onglets analytics. Les autres `clipboard.writeText` du repo (codes CCC, références, parrainage) restent inchangés — ils copient du **texte fonctionnel**, pas une image partageable.

### Comportement cible

Au clic sur le bouton **Partager** (icône `Share2` de lucide-react) :

1. **Génération de l'image** (réutilise la logique existante : `html-to-image` pour les charts, `html2canvas` pour la carte) → `Blob PNG`.
2. **Tentative `navigator.share`** avec `files: [File]` si supporté (mobile + Safari/Chrome récents) → ouvre la **feuille de partage native** (WhatsApp, Twitter, Facebook, Mail, Messages, etc.).
3. **Fallback popover** si `navigator.canShare({ files })` est `false` (desktop la plupart du temps) :
   - **Copier l'image** (presse-papiers — comportement actuel)
   - **Télécharger l'image** (PNG)
   - **Partager sur WhatsApp** (lien `https://wa.me/?text=...` avec URL de la page)
   - **Partager sur X / Twitter** (intent `https://twitter.com/intent/tweet?...`)
   - **Partager sur Facebook** (sharer.php avec URL)
   - **Partager sur LinkedIn** (sharing/share-offsite)
   - **Copier le lien de la page**

> Note : les liens sociaux desktop ne peuvent pas attacher l'image directement (limitation des web intents) — ils partagent l'URL de la page + un texte avec le titre du graphique. L'utilisateur peut copier/télécharger l'image en parallèle pour la joindre manuellement. Mobile via `navigator.share` partage l'image nativement.

### Implémentation

#### 1. Nouveau composant partagé `ShareButton`
Fichier : `src/components/shared/ShareButton.tsx`

Props :
```ts
{ getBlob: () => Promise<Blob>; title: string; size?: 'sm'|'icon-xs'|'icon'; }
```

Contenu :
- Bouton icône `Share2` (`title="Partager"`)
- `Popover` avec la liste d'options ci-dessus (icônes lucide : `Copy`, `Download`, `MessageCircle`/WhatsApp, `Twitter`, `Facebook`, `Linkedin`, `Link`)
- Détection : si `navigator.canShare?.({ files: [testFile] })` → bouton ouvre directement le share natif (sans popover) ; sinon ouvre popover.
- Toasts de feedback (`sonner` / `use-toast` selon le composant appelant)

#### 2. `ChartCard.tsx` (refonte mineure)
- Remplacer `CopyButton` par `ShareButton`
- `getBlob` = factorisation de `useCopyAsImage` → exposer un nouveau hook `useChartImageBlob()` retournant `{ ref, getBlob }`
- Mettre à jour `ChartCard` et `StackedBarCard` (2 appels)

#### 3. `DRCInteractiveMap.tsx`
- Remplacer le bouton "Copier en image" (lignes 508-519) par `<ShareButton getBlob={getMapBlob} title="Carte RDC — {profile}" />`
- Extraire la logique html2canvas dans `getMapBlob: () => Promise<Blob>`
- Conserver la clé de visibilité `'map-copy-button'` (renommer le label admin si nécessaire — voir détails)

#### 4. Configuration admin (cohérence)
- `AdminAnalyticsChartsConfig` expose probablement `'map-copy-button'`. Garder la clé technique pour ne rien casser, mais mettre à jour le label affiché : « Bouton Partager (carte) ». Vérifier également d'éventuelles clés `chart-copy-*` côté charts config.

### Détails techniques

**Fichiers modifiés** :
- `src/components/visualizations/shared/ChartCard.tsx` — remplacer `CopyButton` par `ShareButton`, factoriser hook image
- `src/components/DRCInteractiveMap.tsx` — remplacer le bouton + extraire `getMapBlob`

**Fichier créé** :
- `src/components/shared/ShareButton.tsx` (~120 lignes)

**Dépendances** : aucune nouvelle (lucide-react, popover déjà dispo). `navigator.share` est natif.

**Hors périmètre** :
- Boutons "Copier" ailleurs (codes CCC, références demandes, parrainage, `MortgagePaymentsPanel`, `subdivision/StepSummary`, `ResellerDashboard`, etc.) — ils copient du **texte fonctionnel** (codes/refs), pas pertinent pour le partage social. À traiter dans un chantier séparé si demandé.
- Modification de la table `system_config_audit` ou de la clé d'admin (cosmétique uniquement).

### Validation

- Cliquer le bouton sur un chart sur desktop → popover avec 7 options
- Cliquer sur mobile → feuille de partage native (WhatsApp/Messages/etc.)
- Bouton sur la carte : idem
- Vérifier que les anciennes routes/labels admin n'affichent pas d'erreur

