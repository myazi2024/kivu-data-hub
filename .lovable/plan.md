# Audit du formulaire CCC — constats vérifiés et correctifs

Audit mené sur le formulaire (écrans, hooks, utilitaires) et sur la base réelle
(politiques d'accès, déclencheurs, index interrogés en direct).

## Ce que j'ai trouvé

### Bloquant (vérifié en base)

1. **Le rattachement d'une déclaration à sa parcelle est effacé silencieusement.**
   Un contrôle posé en base vide systématiquement le lien vers la parcelle pour tout
   envoi fait par un utilisateur non-administrateur. Conséquence : les déclarations
   fiscales (impôt foncier, impôt locatif, taxe sur bâtiment), les enregistrements
   d'hypothèque, les autorisations de bâtir et les demandes de correction partent sans
   parcelle rattachée. Côté admin, ces demandes n'apparaissent plus liées au bon dossier.

2. **Le score anti-fraude calculé à l'envoi est jeté.** Le même contrôle remet à vide le
   score et l'indicateur « suspect » à l'insertion. Une fiche marquée suspecte par le
   formulaire arrive donc en revue comme une fiche ordinaire, alors qu'une alerte de fraude
   est bien écrite à côté : les deux sources se contredisent.

3. **Pièces jointes illisibles dans plusieurs écrans.** Le coffre des documents cadastraux
   est privé, mais six écrans (déclarations fiscales, taxe bâtiment, mutation, expertise,
   conflit de limites, litiges) y fabriquent encore des liens « publics ». Ces liens
   renvoient une erreur à l'ouverture. Le formulaire CCC lui-même est déjà correct
   (liens signés).

### Bugs et robustesse

4. **Modification d'une contribution : aucun contrôle anti-fraude.** L'envoi initial vérifie
   le compte et la fraude ; la modification ne vérifie que le blocage du compte. On peut
   donc renvoyer par modification un contenu qui aurait été signalé à l'envoi.

5. **Brouillons locaux jamais purgés.** Chaque parcelle ouverte laisse un brouillon dans le
   navigateur, conservé 30 jours et jamais nettoyé pour les autres parcelles ; il contient
   des données personnelles (propriétaires, adresses). Aucun plafond de place.

6. **Nommage de fichiers par horodatage** dans les déclarations fiscales : deux envois dans
   la même milliseconde s'écrasent. Le reste du projet utilise déjà un identifiant unique.

### Code mort

7. `FormSummaryStep` (392 lignes) n'est plus référencé nulle part.

### Optimisations

8. Le brouillon est réécrit intégralement à chaque frappe (sérialisation complète du
   formulaire toutes les 1,5 s), y compris quand rien de significatif n'a changé.
9. La restauration d'un brouillon déclenche deux mises à jour d'état successives
   (un re-render inutile de tout le formulaire).
10. Les index de la table des contributions sont redondants : `status` seul,
    `(status, created_at)` et `(status, created_at DESC)` coexistent — coût d'écriture
    inutile à chaque envoi.

## Corrections proposées, par étapes

**Étape A — Rattachement parcelle et anti-fraude (base de données)**
- Ne plus effacer le lien vers la parcelle : le conserver quand il désigne une parcelle
  réellement existante, le vider sinon.
- Conserver le score et l'indicateur de suspicion produits à l'envoi, tout en empêchant
  toujours l'utilisateur de se déclarer lui-même validé ou vérifié.
- Aligner la règle d'accès correspondante pour qu'elle accepte ce lien.

**Étape B — Liens de pièces jointes**
- Remplacer les liens « publics » par des liens signés via l'utilitaire déjà en place,
  dans les six écrans concernés.
- Passer au nommage par identifiant unique pour les documents fiscaux.

**Étape C — Modification sécurisée**
- Appliquer à la modification les mêmes contrôles qu'à l'envoi (compte bloqué + détection
  de fraude), avec mise à jour du score sur la fiche.

**Étape D — Brouillons**
- Purger les brouillons périmés et limiter leur nombre à l'ouverture du formulaire ;
  n'écrire que si le contenu a réellement changé.

**Étape E — Nettoyage et performance**
- Supprimer l'écran mort `FormSummaryStep`.
- Restauration de brouillon en une seule mise à jour d'état.
- Retirer les index redondants de la table des contributions.

Vérification après chaque étape : contrôle de types et suite de tests complète.

## Détails techniques

- Déclencheur `aaa_normalize_contribution_insert` → `normalize_contribution_insert()` :
  force `original_parcel_id := NULL`, `fraud_score := NULL`, `is_suspicious := NULL` pour
  tout non-admin. Policy INSERT `Users can create their own contributions` exige en plus
  `original_parcel_id IS NULL`. Appelants impactés : `PropertyTaxCalculator.tsx:201`,
  `BuildingTaxCalculator.tsx:229`, `IRLCalculator.tsx:194`, `MortgageFormDialog.tsx:323`,
  `MortgageCancellationDialog.tsx:370`, `BuildingPermitFormDialog.tsx:206`,
  `CorrectionRequestDialog.tsx:56`.
- `getPublicUrl` sur bucket privé `cadastral-documents` : `PropertyTaxCalculator.tsx:177,189`,
  `BuildingTaxCalculator.tsx:218`, `TaxFormDialog.tsx:192`, `MutationRequestDialog.tsx:329,429`,
  `RealEstateExpertiseRequestDialog.tsx:1052,1068,1084`, `BoundaryConflictDialog.tsx`,
  `disputeUploadUtils.ts:71` → utiliser `uploadCccDocument` / `getSignedStorageUrl`.
- `useCadastralContribution.tsx` : `updateContribution` n'appelle pas `validateUserSecurity`.
- `useFormPersistence.ts` : clé `cadastral_contribution_<parcel>`, TTL 30 j sans purge
  transverse ; `loadFormDataFromStorage` appelle `setFormData` deux fois (l. 192 et 217).
- Index redondants : `idx_cadastral_contributions_status`,
  `cadastral_contributions_status_created_idx` (doublon de `..._status_created_desc`).
- Vérification : `npx tsgo --noEmit -p tsconfig.app.json` puis `npx vitest run`.
