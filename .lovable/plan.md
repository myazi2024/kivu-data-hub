

# Refonte de l'affichage des informations parcellaires — Format Document

## Probleme actuel

Le composant `CadastralResultCard.tsx` (1340 lignes) affiche les donnees dans de petites cartes avec du texte minuscule (10px-13px), des badges compacts et des layouts en `flex justify-between`. C'est optimise pour une vue mobile "app" mais pas pour l'exploitation des informations. L'utilisateur souhaite un format document structure, lisible et imprimable.

## Approche

Creer un nouveau composant `CadastralDocumentView` qui presente les donnees payees dans un format document A4-like (feuille blanche, marges, sections titrees, tableaux structures). Le composant existant `CadastralResultCard` continue de gerer la logique d'acces/paiement, mais delegue l'affichage des donnees au nouveau composant.

```text
Flux actuel:
  CadastralResultsDialog → CadastralResultCard (billing OU affichage cards)

Flux refonte:
  CadastralResultsDialog → CadastralResultCard (billing OU CadastralDocumentView)
```

## Structure du document

Le format document reprendra les sections existantes dans un layout papier:

```text
┌─────────────────────────────────────┐
│  BIC - Bureau de l'Immobilier       │
│  FICHE CADASTRALE                   │
│  Parcelle N° XX/YY/ZZ              │
│  Generee le DD/MM/YYYY             │
├─────────────────────────────────────┤
│  1. IDENTIFICATION DE LA PARCELLE   │
│  ┌─────────────┬──────────────┐     │
│  │ Type        │ Section Urb. │     │
│  │ Surface     │ 450 m²       │     │
│  │ Usage       │ Habitation   │     │
│  └─────────────┴──────────────┘     │
│                                     │
│  2. PROPRIETAIRE ACTUEL             │
│  Nom: ...                           │
│  Statut juridique: ...              │
│  Depuis: ...                        │
│                                     │
│  3. LOCALISATION                    │
│  Province: ... | Ville: ...         │
│  Coordonnees GPS: ...               │
│                                     │
│  4. HISTORIQUE DE PROPRIETE         │
│  ┌──────────┬────────┬──────────┐   │
│  │ Periode  │ Nom    │ Type mut.│   │
│  └──────────┴────────┴──────────┘   │
│                                     │
│  5. OBLIGATIONS FINANCIERES         │
│  5.1 Taxes foncieres (tableau)      │
│  5.2 Hypotheques (tableau)          │
│                                     │
│  6. AUTORISATIONS DE BATIR          │
│  7. BORNAGE                         │
│  8. LITIGES FONCIERS                │
│                                     │
│  ─── Disclaimer + QR verification ──│
└─────────────────────────────────────┘
```

## Plan d'implementation

### 1. Creer `CadastralDocumentView.tsx`

Nouveau composant presentant les donnees dans un format document:
- Fond blanc avec ombre (aspect feuille A4)
- En-tete avec logo BIC, numero de parcelle, date de generation
- Sections numerotees avec titres en bleu fonce
- Donnees en tableaux structures (2 colonnes label/valeur) au lieu de cards
- Taille de texte lisible (14px labels, 15px valeurs au lieu de 10-13px)
- Boutons d'action en haut: Telecharger PDF, Imprimer, Retour au catalogue
- Chaque section n'apparait que si le service correspondant est paye
- Pied de page avec disclaimer et lien de verification
- Design responsive: pleine largeur sur mobile, max-w-4xl centre sur desktop

### 2. Modifier `CadastralResultCard.tsx`

Apres paiement, au lieu d'afficher les cards avec onglets, rendre `CadastralDocumentView` en lui passant:
- `result` (donnees cadastrales)
- `paidServices` (services payes)
- `catalogServices` (catalogue pour le PDF)
- Callbacks pour telecharger/imprimer

Cela remplace tout le bloc apres `if (showBillingPanel)` (lignes 397-1337), soit ~940 lignes de JSX complexe remplacees par un appel au nouveau composant.

### 3. Adapter `CadastralResultsDialog.tsx`

Elargir le conteneur quand le document est affiche: passer de `md:max-w-2xl` a `md:max-w-4xl` pour que le format document ait assez d'espace.

## Details techniques

- Les sections verrouillees affichent un placeholder discret "Section non incluse dans votre abonnement" au lieu du `LockedServiceOverlay` actuel
- Le composant `DisputesContent` (requete Supabase pour litiges) est reutilise tel quel
- Les composants `DocumentAttachment` et `VerificationButton` sont reutilises dans le format document
- L'impression utilise `@media print` avec des styles dedies pour masquer les boutons et optimiser le rendu papier
- Le generateur PDF existant (`generateCadastralReport`) reste disponible pour le telechargement

## Fichiers impactes

| Action | Fichier |
|--------|---------|
| Cree | `src/components/cadastral/CadastralDocumentView.tsx` — Nouveau composant format document |
| Modifie | `src/components/cadastral/CadastralResultCard.tsx` — Delegation de l'affichage au nouveau composant |
| Modifie | `src/components/cadastral/CadastralResultsDialog.tsx` — Elargir le conteneur pour le format document |

