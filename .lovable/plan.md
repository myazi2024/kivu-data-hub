## Problème

Dans `TaxManagementDialog` (Carte cadastrale → Taxes foncières), 4 onglets de même niveau coexistent : **Foncier**, **Bâtisse**, **Locatif**, **Ajouter**. Cela mélange deux logiques différentes :

- Les 3 premiers servent à **déclarer un nouvel impôt** (avec calcul automatique).
- Le 4ème sert à **enregistrer manuellement un paiement déjà effectué** (historique).

Sur mobile (360 px), les 4 puces sont aussi très serrées (text-[10px], px-1.5, troncature visible).

## Réorganisation proposée

Hiérarchie à 2 niveaux :

```text
TaxManagementDialog
├── Onglet 1 : "Déclarer un impôt"   (icône Calculator)
│   └── Sous-onglets :
│       ├── Foncier   (PropertyTaxCalculator)
│       ├── Bâtisse   (BuildingTaxCalculator)
│       └── Locatif   (IRLCalculator)
│
└── Onglet 2 : "Ajouter un paiement"  (icône Plus)
    └── TaxFormDialog (embedded) — enregistrement d'un impôt déjà payé
```

### Avantages

- Sépare clairement **déclaration officielle** (génère une fiche transmise à DGI/DGR) vs **enregistrement historique** (saisie d'un paiement passé pour mémoire).
- Sur mobile, 2 onglets racine = labels lisibles en plein texte (plus de troncature).
- Les 3 sous-onglets de déclaration restent groupés logiquement (tous = "calculer + déclarer").

## Modifications techniques

**`src/components/cadastral/TaxManagementDialog.tsx`** (seul fichier touché)

1. Remplacer le type `ActiveTab` :
   ```ts
   type RootTab = 'declare' | 'add';
   type DeclareSubTab = 'foncier' | 'batisse' | 'irl';
   ```
2. Deux `useState` : `rootTab` (défaut `'declare'`) et `declareSubTab` (défaut `'foncier'`).
3. `DialogHeader` : 2 gros boutons d'onglets racine (h-9, text-xs, icônes lisibles, plus de troncature).
4. Quand `rootTab === 'declare'` : afficher une seconde rangée de 3 sous-onglets (Foncier / Bâtisse / Locatif) au-dessus du contenu, style cohérent avec l'existant (h-8, rounded-xl).
5. Quand `rootTab === 'add'` : afficher directement `TaxFormDialog` embedded, sans sous-onglets.
6. Conserver `key={...}` sur chaque calculator pour préserver l'isolation d'état (anti state-bleeding déjà en place).
7. Reset des deux états à l'ouverture (`useEffect` sur `open`).

**Texte d'intro `FormIntroDialog`** : inchangé (déjà cohérent : il décrit les 4 services).

### Hors scope

- Pas de modification des calculators eux-mêmes (`PropertyTaxCalculator`, `BuildingTaxCalculator`, `IRLCalculator`, `TaxFormDialog`).
- Pas de migration DB, pas de changement de logique métier ou de RPC.
- Pas de modification de l'analytics ou des notifications.

## Vérification

- Charger la carte cadastrale → ouvrir une parcelle → "Taxes foncières".
- Vérifier en 360 px que les 2 onglets racine sont lisibles sans troncature.
- Vérifier que le passage Déclarer ↔ Ajouter conserve un état propre (re-mount via `key`).
- Vérifier que les sous-onglets Foncier/Bâtisse/Locatif fonctionnent comme avant.
