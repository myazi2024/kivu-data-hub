

# Audit detaille — Formulaire de demande de titre foncier

## 1. Architecture generale

Le formulaire est compose de :
- **`LandTitleRequestDialog.tsx`** (3 552 lignes) — Composant monolithique contenant tout le formulaire
- **`useLandTitleRequest.tsx`** (335 lignes) — Hook de soumission (upload + insertion Supabase)
- **`LandTitleReviewTab.tsx`** (494 lignes) — Onglet recapitulatif
- **`UserLandTitleRequests.tsx`** (322 lignes) — Liste cote utilisateur
- **`AdminLandTitleRequests.tsx`** (802 lignes) — Vue admin avec detail

La table Supabase `land_title_requests` contient ~67 colonnes. RLS en place : 5 policies couvrant SELECT/INSERT/UPDATE pour users et admins.

## 2. Flux complet (front-end)

Le formulaire comporte 6 onglets : **Demande** → **Localisation** → **Mise en valeur** → **Documents** → **Frais** → **Revision**

### 2.1 Onglet Demande (requester)
- **Type de demande** : 3 valeurs (`initial`, `renouvellement`, `conversion`) — OK
- **Fiche parcellaire** : question oui/non pour initial/conversion, numero de parcelle pour renouvellement — OK
- **Qualite du demandeur** : 3 options (`owner`, `beneficiary`, `representative`) — OK
- **Statut juridique** : 3 options (Personne physique, Personne morale, Etat) avec champs conditionnels — OK, aligne sur CCC
- **Bloc proprietaire** : affiche pour beneficiary et representative, memes champs conditionnels — OK

### 2.2 Onglet Localisation
- Province → Zone (urbaine/rurale) → cascade geo — OK
- GPS + dimensions parcellaires + cotes routiers — OK
- Mode parcel-linked : affichage masque PII + croquis SVG — OK

### 2.3 Onglet Mise en valeur
- Categorie → Type construction → Materiaux → Nature (auto) → Usage — OK, aligne sur CCC
- Nationalite + eligibilite + deduction du titre — OK
- Mode parcel-linked : lecture seule + choix exact/mise a jour — OK
- Autorisation de batir : lecture seule + formulaire de mise a jour — OK

### 2.4 Onglet Documents
- Piece d'identite demandeur, proprietaire (si representative), preuve de propriete, procuration (si representative) — OK

### 2.5 Onglet Frais
- Calcul dynamique via `useLandTitleDynamicFees` — OK

### 2.6 Onglet Revision
- Recapitulatif complet avec champs conditionnels — OK

## 3. Anomalies identifiees

### 3.1 FRONT-END

| # | Severite | Composant | Description |
|---|----------|-----------|-------------|
| F1 | **Haute** | `LandTitleRequestDialog.tsx` L3552 | **Fichier monolithique de 3 552 lignes**. Difficile a maintenir. Les blocs demandeur (parcel-linked L1543-1700 et standard L1708-1910) sont dupliques quasi-identiquement (~170 lignes x2). Devrait etre extrait en un composant reutilisable `RequesterFields`. |
| F2 | **Moyenne** | `LandTitleRequestDialog.tsx` L675 | **Validation `isFormValid` incomplete pour beneficiary**. La condition `requesterType !== "representative"` (L105 ReviewTab, L704-706 Dialog) ne verifie la presence des infos proprietaire que pour `representative`, pas pour `beneficiary`. Un ayant droit peut soumettre sans renseigner le proprietaire en mode standard (non parcel-linked). |
| F3 | **Moyenne** | `LandTitleRequestDialog.tsx` L691-694 | **Validation personne morale insuffisante**. `isFormValid` verifie uniquement `requesterGender` pour personne physique, mais ne valide pas les champs obligatoires pour personne morale (`requesterEntityType`, `requesterEntitySubType`, raison sociale) ni pour Etat (`requesterRightType`). Le formulaire peut etre soumis avec des champs conditionnels vides. |
| F4 | **Moyenne** | `LandTitleRequestDialog.tsx` L700 | **Validation proprietaire insuffisante**. Pour le proprietaire (quand non owner), seuls `ownerLastName` et `ownerFirstName` sont verifies. Pas de validation du statut juridique proprietaire ni de ses champs conditionnels (entite, RCCM, type de droit). |
| F5 | **Basse** | `LandTitleReviewTab.tsx` L100-106 | **`requesterComplete` ne couvre pas beneficiary**. La condition `requesterType !== "representative"` devrait etre `requesterType === 'owner'` pour exiger les infos proprietaire aussi pour les ayants droit. |
| F6 | **Basse** | `LandTitleRequestDialog.tsx` L3232-3265 | **Documents : piece d'identite proprietaire uniquement pour `representative`**. Le upload de la piece d'identite du proprietaire et la procuration ne sont affiches que pour `representative`. Pour `beneficiary`, la piece d'identite proprietaire devrait aussi etre demandee (le proprietaire est different). |
| F7 | **Basse** | `LandTitleReviewTab.tsx` L409-423 | **Documents review : meme probleme**. L'affichage des documents proprietaire et procuration dans le recap n'est conditionne que sur `representative`, pas sur `beneficiary`. |
| F8 | **Info** | `LandTitleRequestDialog.tsx` | **Pas de validation email**. Le champ email n'a aucune validation de format cote formulaire (accepte n'importe quelle chaine). |
| F9 | **Info** | `LandTitleRequestDialog.tsx` L3089-3098 | **Logique d'alignement conversion manquante**. Le paragraphe contextuel comparant type de demande et titre deduit ne gere pas `requestType === 'conversion'` : il affiche "une demande initiale" ou "un renouvellement" mais pas "une conversion". |
| F10 | **Info** | `LandTitleRequestDialog.tsx` | **Pas de sanitisation des inputs**. Les champs texte (nom, raison sociale, RCCM) n'ont aucune restriction de longueur ni de caracteres. |

### 3.2 BACK-END (Supabase)

| # | Severite | Element | Description |
|---|----------|---------|-------------|
| B1 | **Haute** | `useLandTitleRequest.tsx` L200-267 | **Insertion avec `as any`**. Le cast `as any` sur l'objet d'insertion bypasse completement la verification de type TypeScript. Toute colonne inexistante ou mal nommee sera ignoree silencieusement. |
| B2 | **Moyenne** | Table `land_title_requests` | **Pas de contrainte de validation sur `requester_type`**. Le champ accepte n'importe quelle valeur texte. Devrait avoir un CHECK (`owner`, `beneficiary`, `representative`). |
| B3 | **Moyenne** | Table `land_title_requests` | **Pas de contrainte sur `request_type`**. Meme probleme : accepte n'importe quel texte au lieu de `initial`, `renouvellement`, `conversion`. |
| B4 | **Moyenne** | Table `land_title_requests` | **Pas de contrainte sur `status` et `payment_status`**. Les valeurs par defaut existent mais pas de CHECK empechant des valeurs invalides. |
| B5 | **Moyenne** | `useLandTitleRequest.tsx` L254-263 | **`additional_documents` ecrase le default `[]`**. La colonne a un default `'[]'::jsonb` mais le formulaire insere toujours un objet `{requester_entity_type: ..., ...}`. Cela fonctionne mais le type attendu (array vs object) est incoherent avec le nom de colonne et le default. |
| B6 | **Basse** | Upload (`useLandTitleRequest.tsx` L98-128) | **Fallback upload vers bucket `public`**. Si le bucket `land-title-documents` echoue, le code tente un upload vers `public/land-titles/`. Ce fallback peut exposer des documents sensibles si le bucket `public` est effectivement public. |
| B7 | **Basse** | RLS policies | **Update policy trop large pour admins**. La policy `Admins can update land title requests` permet la mise a jour de tous les champs sans restriction (pas de `with_check`). Un admin pourrait modifier `user_id` ou `reference_number`. |
| B8 | **Basse** | Table | **141 demandes en statut `pending/pending`**. Il y a 141 enregistrements ou `status=pending` et `payment_status=pending`, probablement des demandes abandonnees apres creation du record (avant paiement). Aucun mecanisme de nettoyage automatique n'existe. |
| B9 | **Info** | Table | **Colonne `occupation_duration` inutilisee**. Le formulaire ne collecte jamais cette donnee mais la colonne existe en base et l'admin l'affiche (toujours vide). |

### 3.3 Donnees test et Analytics

| # | Severite | Element | Description |
|---|----------|---------|-------------|
| T1 | **Basse** | `testDataGenerators.ts` | Les valeurs generees pour `requester_legal_status` devraient inclure `Personne morale` et `Etat` en plus de `Personne physique` pour tester les champs conditionnels dans les analytics. |
| T2 | **Basse** | `analyticsHelpers.ts` | `FIELD_LABELS` couvre `request_type` et `requester_type` mais pas `requester_legal_status`, `section_type`, ni `deduced_title_type` — les graphiques affichent les valeurs brutes pour ces champs. |

## 4. Resume

```text
Severite    Front-end    Back-end    Total
─────────   ─────────    ────────    ─────
Haute       1 (F1)       1 (B1)        2
Moyenne     3 (F2-F4)    4 (B2-B5)     7
Basse       3 (F5-F7)    4 (B6-B9)     7
Info        3 (F8-F10)   1 (B9)        4
─────────   ─────────    ────────    ─────
Total       10           10           20
```

**Priorites de correction recommandees :**
1. **F2+F5** : Corriger la validation pour inclure `beneficiary` dans les verifications proprietaire
2. **F3+F4** : Ajouter la validation des champs conditionnels (personne morale, Etat) dans `isFormValid`
3. **F6+F7** : Afficher les documents proprietaire aussi pour `beneficiary`
4. **F9** : Gerer `conversion` dans le paragraphe d'analyse d'eligibilite
5. **B1** : Supprimer le `as any` et typer correctement l'insertion
6. **B8** : Ajouter un mecanisme de nettoyage des demandes abandonnees (cron ou TTL)
7. **F1** : Extraire les blocs dupliques en composants reutilisables (refactoring structurel)

