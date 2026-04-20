

## Audit détaillé — Fiche parcellaire (CadastralDocumentView)

### Périmètre

Vue document affichée après paiement dans `/cadastral-map` → `CadastralResultCard` → `CadastralDocumentView`. Composée de 5 unités structurelles + 7 sections métier.

| Unité | Fichier | Rôle |
|---|---|---|
| Toolbar | `DocumentToolbar` | Retour catalogue, PDF, Imprimer |
| Header | `DocumentHeader` | RDC/BIC, n° parcelle, type SU/SR, badge litige |
| 7 sections | `sections/*.tsx` | Identification, Propriétaire, Construction, Localisation, Historique, Obligations, Litiges |
| Footer | `DocumentFooter` | QR vérification + disclaimer |
| Primitives | `primitives.tsx` | `SectionCard`, `DataField`, `DocTable`, `LockedSection`, `StatusAlert` |

### Catalogue services en BD (référence)

| service_id | Nom | Prix | Section affectée |
|---|---|---|---|
| `information` | Informations générales | 1.50 $ | Identification + Propriétaire |
| `location_history` | Localisation & bornage | 2.00 $ | Localisation |
| `history` | Historique propriétaires | 3.00 $ | Historique |
| `obligations` | Obligations fiscales/hyp. | 15.00 $ | Obligations |
| `land_disputes` | Litiges fonciers | 6.99 $ | Litiges |

### État global

✅ Architecture solide :
- Modularisation propre (1 section = 1 fichier, < 130 lignes)
- Primitives réutilisables sémantiques (jetons design)
- QR code de vérification via `createDocumentVerification` (flux PII conforme)
- Footer juridique complet (avis non-responsabilité, lien recours Affaires Foncières)
- Croquis SVG GPS si ≥ 3 bornes
- Responsive + classes `print:*` pour impression

### 🔴 Bug bloquant — Mauvais service ID pour les Litiges

`CadastralDocumentView.tsx:57` :
```ts
const hasDisputesAccess = paidServices.includes('disputes') || ...
```

Mais l'ID en BD est **`land_disputes`**, pas `disputes`. Conséquence :
- Si l'utilisateur achète **uniquement** le service Litiges (6.99 $) sur une parcelle **sans aucun litige enregistré**, la condition `paidServices.includes('disputes')` est **fausse** → la section affiche le `LockedSection` « Litiges fonciers non incluse dans votre achat » alors que le service a été payé.
- L'utilisateur paie 6.99 $ et voit toujours « débloquer ce service ».
- Cas masqué uniquement quand `land_disputes.length > 0` (le `||` second membre passe).

**Fix** : remplacer `'disputes'` par `'land_disputes'`.

### 🟠 Cohérence — IDs services incohérents entre fichiers

Mêmes incohérences potentielles à vérifier (audit croisé) :
- `paidServices.includes('history')` ✅ correspond à BD
- `paidServices.includes('obligations')` ✅ correspond à BD
- `paidServices.includes('disputes')` ❌ devrait être `'land_disputes'`
- Pas de check explicite pour `'information'` / `'location_history'` — la visibilité s'appuie sur la présence des données (`hasParcelData`, `hasLocationData`). Si l'utilisateur paie `information` sur une parcelle sans `current_owner_name`, la section reste verrouillée → **expérience trompeuse**.

**Recommandation** : faire dépendre la visibilité de chaque section **d'abord** du `paidServices.includes(serviceId)`, **puis** du contenu. Sinon un service payé sans données affiche un Lock.

### 🟠 Numérotation incorrecte des sections verrouillées

`sn(key)` retourne `visibleSections.indexOf(key) + 1`. Or `visibleSections` filtre les sections qui n'ont **pas** de données. Conséquence : 
- Si `hasParcelData=false`, identification + owner sont retirés de `visibleSections`, mais la section locked « Identification & Propriétaire » est numérotée `1` en dur (ligne 97).
- La section `location` verrouillée appelle `sn('location') || visibleSections.length + 1` → fallback acceptable.
- La section `history` verrouillée appelle `sn('history')` → renvoie **0** car `'history'` est filtré quand pas de données ET pas payé. Affichage : « Section 0 » 🐛.

**Fix** : appliquer le pattern `sn(...) || (visibleSections.length + offset)` à **toutes** les sections verrouillées, ou recalculer une numérotation séquentielle par rendu.

### 🟠 LegalSection — composant orphelin

`sections/LegalSection.tsx` existe (47 lignes) mais **n'est jamais importé** dans `CadastralDocumentView.tsx`. Il consomme `legal_verification` (présent dans `CadastralSearchResult` et renvoyé par la RPC `get_cadastral_parcel_data`). Donc :
- L'utilisateur ne voit **jamais** les champs `title_type`, `title_reference`, `title_issue_date`, `has_dispute`, `is_subdivided` côté juridique structuré.
- Le code est mort → bruit + dette.

**Décision à prendre** :
- (a) supprimer `LegalSection.tsx`, OU
- (b) l'intégrer comme 8ᵉ section (catalogue manquant pour facturation) ou la fusionner dans Identification.

### 🟡 ConstructionSection — emojis dans le rendu

`ConstructionSection.tsx:54` : `{isValid ? '✅ Valide' : '❌ Expiré'}`. Inaccessible aux lecteurs d'écran et incohérent avec le reste du document (qui utilise `Badge` + `lucide-react`).

**Fix** : remplacer par `<Badge variant="default|destructive">Valide / Expiré</Badge>` + icône `CheckCircle2`/`XCircle`.

### 🟡 LegalSection — emojis ⚠/✅

Même problème dans `LegalSection.tsx:26-27,32`. Si le composant est ré-intégré, à corriger.

### 🟡 DocumentToolbar — pas de `aria-label` ni état chargement PDF

- Bouton « Télécharger PDF » : aucun spinner pendant la génération → un double-clic produit deux PDF (la fonction `generateCadastralReport` est async et fait un fetch DB).
- Pas de toast d'erreur si le PDF échoue.
- `window.print()` non protégé : pas de raccourci clavier annoncé via `title` ou `aria-keyshortcuts`.

### 🟡 LocationSection — `parcel.latitude.toFixed(6)` peut crasher

Ligne 64 : `parcel.latitude.toFixed(6)` est appelé sans `Number()`. Si la BD renvoie une **string** (ce qui arrive avec PostgREST sur `numeric`), `toFixed` n'existe pas → exception runtime, section cassée.

**Fix** : `Number(parcel.latitude).toFixed(6)`.

### 🟡 IdentificationSection — variance surface mal cadrée

`surfaceVariance > 10` → rouge, sinon ambre. Pas de seuil intermédiaire « OK < 1 % vert ». La condition `Math.abs(surfaceVariance) > 1` masque l'indicateur si écart faible — bon. Mais aucune **explication** n'est donnée à l'utilisateur (« Pourquoi un écart ? »). Ajouter un `Popover` info comme pour `property_title_type`.

### 🟡 OwnershipHistory — pas de tri chronologique

`HistorySection.tsx` itère `ownershipHistory.map(...)` dans l'ordre de la base. Aucune garantie de tri descendant par `ownership_start_date`. Lecture confuse si la RPC ne trie pas.

**Fix** : `.sort((a, b) => +new Date(b.ownership_start_date) - +new Date(a.ownership_start_date))`.

### 🟡 ObligationsSection — agrégat hypothèque sans statut « radié »

Ligne 110 : `['paid_off', 'Éteinte'].includes(...) ? 'Éteinte' : ...`. Manque les statuts EN normalisés (`released`, `cancelled`) qui peuvent exister selon la mémoire « Mortgage specs ». Si un statut inattendu arrive → tag `'Défaillante'` à tort.

### 🟡 DocumentFooter — QR sans alternative texte

`<canvas>` n'a pas de `aria-label`. Lecteur d'écran : invisible. Utilisateur sans JS : aucun fallback. Le `verifyUrl` est affiché en clair en dessous → OK pour copie, mais ajouter `role="img" aria-label="QR code de vérification"` au canvas serait propre.

### 🟡 DocumentHeader — accent rouge fixe en dur

Pas de problème direct, mais les classes `text-amber-600`, `text-green-600`, `bg-amber-50/50`, `border-green-200` apparaissent dans `IdentificationSection`, `ConstructionSection`, `ObligationsSection` → **violation de la mémoire « semantic styling »** qui interdit les classes Tailwind couleurs brutes en dehors du dark/light token system. Doit utiliser des tokens (`text-warning`, `text-success`, etc.) ou `--ring`-like via `index.css`.

### 🟡 Print stylesheet — section `.cadastral-document` non scopée

`<div className="cadastral-document">` est utilisé comme racine mais aucune règle CSS dédiée trouvée. Le `print:break-before-page` sur le croquis (ligne 89 `LocationSection`) est correct, mais aucune règle anti-coupure (`break-inside-avoid`) sur les `SectionCard` → tableaux d'historique coupés en deux pages.

### Synthèse

| Sévérité | Nombre | Items |
|---|---|---|
| 🔴 Bloquant | 1 | Service ID `disputes` ≠ `land_disputes` |
| 🟠 Robustesse | 3 | Numérotation locked sections, IDs services croisés, `LegalSection` orphelin |
| 🟡 UX/A11y/dette | 9 | Emojis, latitude string, tri historique, classes couleurs brutes, QR a11y, print, etc. |

### Recommandations (à valider avant implémentation)

1. **Fix bloquant** : `'disputes'` → `'land_disputes'` (`CadastralDocumentView.tsx:57`).
2. **Numérotation** : refactor `sn()` pour numéroter linéairement même les sections lockées, OU ajouter un fallback explicite à chaque appel (`sn('history') || X`).
3. **LegalSection** : décider — supprimer le fichier orphelin OU l'intégrer comme section dédiée (et créer un service catalogue `legal_verification`).
4. **Visibilité par achat** : changer la logique « hasData OU paidService » en « paidService AND (hasData OU empty state) » — éviter les Lock sur services payés sans données.
5. **Coercition numérique** : `Number(parcel.latitude).toFixed(6)` (et même check pour `longitude`, `area_sqm`, `surface_calculee_bornes`).
6. **A11y** : retirer emojis ✅❌⚠ → Badge + icône lucide ; ajouter `aria-label` au QR ; ajouter état loading au bouton PDF.
7. **Tri historique** : trier `ownership_history` desc par `ownership_start_date`.
8. **Statuts hypothèque** : aligner sur l'enum normalisé (mémoire mortgage specs).
9. **Couleurs sémantiques** : remplacer `text-amber-600`, `bg-amber-50/50`, etc. par tokens (`text-warning-foreground`, etc.) — créer les tokens si absents.
10. **Print** : ajouter `print:break-inside-avoid` sur `SectionCard`.

### Hors périmètre (non investigué)

- Génération PDF (`generateCadastralReport`) — fichier non trouvé via grep dans `src/lib/pdf/`.
- Cache TanStack Query du service `useCadastralServices` realtime.
- Vérification publique `/verify/:code` (déjà couverte par mémoire `doc-verification-privacy-fr`).

Aucune correction ne sera appliquée sans validation explicite.

