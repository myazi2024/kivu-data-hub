

# Corriger les valeurs fictives restantes dans les données de test

## Divergences identifiées

### 1. Historique propriété — `legal_status` (testDataGenerators.ts L608-616)
- **Test** : `'personne_physique'`, `'personne_morale'` (snake_case)
- **Formulaire CCC** (picklist_legal_status) : `'Personne physique'`, `'Personne morale'`, `'État'`
- **Impact** : Le graphique "Statut juridique" dans l'onglet Ownership affiche des catégories non reconnues

### 2. Historique propriété — `mutation_type` (testDataGenerators.ts L609-618)
- **Test** : `'vente'`, `'achat'` (minuscules, et `'achat'` n'existe pas)
- **Formulaire CCC** (picklist_mutation_type) : `'Vente'`, `'Donation'`, `'Succession'`, `'Expropriation'`, `'Échange'`
- **Impact** : Le graphique "Type mutation" affiche `vente` et `achat` au lieu des catégories standardisées

### 3. Certificats — `certificate_type` (testDataGenerators.ts L745-754)
- **Test** : `'attestation_cadastrale'`, `'certificat_bornage'`
- **Référentiel** (types/certificate.ts) : `'expertise_immobiliere'`, `'titre_foncier'`, `'permis_construire'`, `'mutation_fonciere'`, `'lotissement'`
- **Impact** : Le graphique "Type certificat" affiche des catégories fantômes non reconnues par `CERTIFICATE_TYPE_LABELS`

### 4. Autorisations de bâtir — `administrative_status` (testDataGenerators.ts L723)
- **Test** : `'Conforme'`, `'Non autorisé'`
- **Formulaire CCC** (picklist_permit_admin_status) : `'En attente'`, `'Approuvé'`, `'Rejeté'`, `'Expiré'`
- **Impact** : Le graphique "Statut admin" dans l'onglet Parcelles affiche des catégories fantômes

## Corrections

### Fichier : `testDataGenerators.ts`

**Historique propriété (L608-618)** :
- `legal_status: 'personne_physique'` → `'Personne physique'`
- `legal_status: 'personne_morale'` → `'Personne morale'`
- `mutation_type: 'vente'` → `'Vente'`
- `mutation_type: 'achat'` → `'Donation'`

**Certificats (L745, L754)** :
- `certificate_type: 'attestation_cadastrale'` → `'titre_foncier'`
- `certificate_type: 'certificat_bornage'` → `'mutation_fonciere'`

**Autorisations de bâtir (L723)** :
- `administrative_status: 'Conforme'` → `'Approuvé'`
- `administrative_status: 'Non autorisé'` → `'Rejeté'`

### Fichier : `testCadastralReport.ts`
- Vérifier et corriger `administrative_status: 'Conforme'` → `'Approuvé'`

## Fichiers impactés

| Fichier | Action |
|---------|--------|
| `src/components/admin/test-mode/testDataGenerators.ts` | Corriger ~8 valeurs (ownership, certificates, permits) |
| `src/utils/testCadastralReport.ts` | Corriger `administrative_status` |

2 fichiers modifiés, ~9 valeurs corrigées.

