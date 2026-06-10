# Plan — Audit & enrichissement de l'onglet « Valeur marchande »

## 1. Bug Année / Environnement sonore (root cause + correctif)

**Constat.** Les lignes `t.constructionYear` et `t.soundEnvironment` ne sont rendues que si la valeur est *truthy*. Or :
- `formData.soundEnvironment` peut être `''` (chaîne vide) tant que l'utilisateur n'a pas validé l'onglet *Localisation* → `sharedSound` falsy → ligne masquée silencieusement.
- Sur les **constructions additionnelles**, `constructionYear` est typé `string` (cf. `useCadastralContribution.tsx` L79) mais le builder le propage en `number`. Une chaîne « 2018 » s'affiche, mais une chaîne `''` reste falsy.
- Sur les unités de l'onglet *Locaux multiples*, l'année de construction et l'environnement sonore ne sont jamais re-vérifiés : si le champ source est vide, aucun feedback n'est donné à l'utilisateur (il ne sait pas où compléter).

**Correctifs.**
1. Dans `buildVacantTargets` :
   - Normaliser `constructionYear` : `Number(c.constructionYear) || formData.constructionYear || undefined`.
   - Toujours assigner `soundEnvironment = formData.soundEnvironment || undefined` (et garder le partage parcelle, cf. mémoire `sound-environment-centralization-fr`).
2. Dans le rendu de la « meta » de chaque local, **toujours afficher les deux lignes**, même si la valeur manque :
   - `Année : 2018` ou `Année : — Compléter dans Infos` (lien cliquable → `handleTabChange('general')`).
   - `Environnement sonore : Calme` ou `Environnement sonore : — Compléter dans Localisation` (lien → `handleTabChange('location')`).
   - Style : badge discret `bg-amber-500/10` quand la valeur manque.

## 2. Enrichissement des cartes de local (héritage onglets précédents)

Étendre le type `Target` et le rendu pour afficher (en badges/lignes meta) :

**Caractéristiques** (depuis Infos / unités) :
- Surface du local (m²) — `unit.areaSqm` ou ratio surface principale / nb unités.
- Étage (`unit.floor` ou `formData.floorNumber`).
- Nombre de pièces / chambres / salles de bain (`unit.rooms`, `unit.bedrooms`, `unit.bathrooms` — ajouter ces champs au sous-formulaire *RentalConfigurationFields* si absents).

**Équipements / commodités** (depuis Infos & Équipements) :
- Eau, électricité, internet, parking, sécurité, jardin — lus depuis `formData.hasWater`, `hasElectricity`, `hasInternet`, `hasParking`, `hasSecurity`, `hasGarden` (champs déjà partiels dans `useCadastralContribution`). Badges icône + label.

**Accessibilité / distances** (depuis Localisation) :
- Distance route principale, marché, école, hôpital — lues depuis `formData.distanceToMainRoadM`, `distanceToMarketKm`, `distanceToSchoolKm`, `distanceToHospitalKm` (mêmes champs que ceux d'expertise — à exposer côté CCC s'ils n'y sont pas, sinon afficher uniquement les présents).

**Règle d'affichage.** Bloc « Caractéristiques héritées » repliable (chevron) par défaut **ouvert si checked**, fermé sinon. Liens « Compléter dans <onglet> » pour chaque champ manquant.

## 3. Annonce LOCATION par local (nouveaux champs)

Étendre `MarketListingEntry` (JSONB `market_listings`, pas de migration) :

```ts
{
  // existant
  listForRent: boolean;
  targetRentUsd?: number;
  coverImageUrls?: string[];          // max 10, ≥1 obligatoire
  // nouveaux
  coverImageMainUrl?: string;         // 1 des 10 marquée principale
  rentCurrency?: 'USD' | 'CDF';
  depositMonths?: number;             // caution en nombre de mois
  availabilityDate?: string;          // ISO date « libre à partir du »
  minLeaseMonths?: number;            // bail minimum
  leaseType?: 'meuble' | 'non_meuble' | 'court_sejour' | 'bureau';
  chargesIncluded?: {                 // cases à cocher
    water?: boolean;
    electricity?: boolean;
    security?: boolean;
    waste?: boolean;
    internet?: boolean;
  };
  description?: string;               // max 500 car.
  contactChannel?: 'whatsapp' | 'phone' | 'email';
  contactValue?: string;              // pré-rempli depuis profil
  visitSlots?: string;                // texte libre court (créneaux)
}
```

**UI.** Section repliable « Détails de l'annonce » sous chaque carte cochée, organisée en 4 sous-blocs :
1. **Loyer & caution** : devise + montant + caution (mois).
2. **Disponibilité & bail** : date d'entrée + bail min + type de location.
3. **Charges incluses** : 5 checkboxes en grille 2 col.
4. **Description, photo principale & contact** : textarea 500 car. + sélecteur « photo principale » (vignettes cliquables des `coverImageUrls`) + canal + valeur + créneaux.

**Validations** (`useFormValidation.ts`) :
- `listForRent === true` → `coverImageUrls.length >= 1` (déjà fait).
- Si `targetRentUsd` ou `rentCurrency` saisi → l'autre devient requis.
- `description.length <= 500`.
- Si `availabilityDate` < aujourd'hui → toast d'avertissement (non bloquant).

## 4. Annonce VENTE parcelle (bloc « accepteriez-vous de vendre »)

Quand `wouldSell === true`, ajouter sous le champ « Montant » :

```ts
// extensions sur formData
saleListing?: {
  coverImageUrls?: string[];          // 1..10, ≥1 obligatoire
  coverImageMainUrl?: string;
  priceNegotiable?: boolean;          // ferme / négociable
  paymentTerms?: 'cash' | 'installments' | 'both';
  availability?: 'immediate' | 'conditional';
  availabilityNote?: string;
  description?: string;               // 500 car.
  contactChannel?: 'whatsapp' | 'phone' | 'email';
  contactValue?: string;
  visitSlots?: string;
};
```

**UI.** Sous-bloc replié par défaut « Détails de l'annonce de vente » (même look que pour la location). Mêmes contraintes images (bucket public `cadastral-documents`, prefix `sale-listings/`, JPG/PNG/WebP ≤ 5 Mo).

**Validations.** Si `wouldSell === true` :
- `saleListing.coverImageUrls.length >= 1`.
- `paymentTerms` requis.
- `availability` requis.

## 5. Garde « Suivant » — étendu

Le garde existant (toast + scroll si une carte cochée manque d'image) couvre désormais aussi :
- l'annonce de vente sans image quand `wouldSell === true` ;
- les couples (loyer/devise) incomplets.

## Fichiers à modifier

| Fichier | Changement |
|---|---|
| `src/components/cadastral/ccc-tabs/MarketValueTab.tsx` | Correctif meta + sous-blocs annonce location/vente, sélecteur « photo principale », garde Suivant étendu |
| `src/hooks/useCadastralContribution.tsx` | Extension `MarketListingEntry` + `saleListing`, mapping payload (sérialisation JSONB) |
| `src/hooks/ccc/useFormValidation.ts` | Règles nouveaux champs (loyer/devise, sale images, description ≤500) |
| `src/components/cadastral/RentalConfigurationFields.tsx` | (Optionnel) champs `rooms/bedrooms/bathrooms/areaSqm` par unité s'ils manquent |

## Hors-périmètre

- Pas de migration DB : tout passe par les JSONB `market_listings` et un nouveau JSONB `sale_listing` (à ajouter dans la colonne JSON existante du CCC si possible, sinon on l'imbrique dans `market_listings._sale`).
- Pas de modification des écrans admin (les nouvelles données restent visibles via le payload brut).
- Pas de publication publique de l'annonce dans ce ticket : on stocke uniquement les données et photos.

## Étapes d'implémentation

1. **Bug fix** Année/Environnement (normalisation + affichage permanent avec liens).
2. **Type & payload** : extension `MarketListingEntry` + `saleListing`, mapping `useCadastralContribution`.
3. **UI location** : sous-blocs repliables + photo principale + checkboxes charges + contact.
4. **UI vente** : sous-bloc symétrique avec uploader.
5. **Validations** dans `useFormValidation.ts` + garde Suivant étendu.
6. **Test manuel** : parcelle multi-locaux avec/sans valeurs amont, soumission bloquée si images manquent, sérialisation correcte côté payload.
