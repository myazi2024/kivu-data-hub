# Audit du formulaire CCC — constats vérifiés et correctifs

État de départ : le code compile (contrôle de types sans erreur) et les 160 tests automatisés passent. Les constats ci-dessous ont tous été vérifiés par lecture du code ou requête en base.

## Constats

### 1. Le type de section enregistré en base est incohérent (bloquant)

À la création d'une parcelle depuis une contribution approuvée, le déclencheur copie tel quel la valeur envoyée par le formulaire : `SU` ou `SR`. La branche de mise à jour (contribution rattachée à une parcelle existante) écrit au contraire `urbain` / `rural`. Vérifié en base : la seule valeur présente aujourd'hui est `SU`.

Conséquences vérifiées :
- La recherche avancée filtre sur `Terrain bâti` / `Terrain nu` pour ce même champ : ce filtre ne peut jamais rien retourner.
- Le calcul de taxe teste `rural` : une parcelle créée par le CCC sera toujours traitée comme urbaine.
- Les analyses foncières et les fiches PDF testent `SU` : elles cesseront d'être correctes dès qu'une contribution de mise à jour écrira `urbain`.

### 2. Les champs récents ne sont pas écrits à la création de la parcelle

La création de parcelle omet la circonscription foncière, l'état de la construction, l'autorisation précédente, l'usage réel, la capacité d'exploitation et le contrat de location. Ces valeurs ne sont récupérées que par un second déclencheur qui repasse derrière en mise à jour — dépendance à l'ordre alphabétique des déclencheurs, fragile et non documentée.

### 3. Effacer une valeur est impossible lors d'une mise à jour

La branche de mise à jour utilise systématiquement « garder l'ancienne valeur si la nouvelle est vide ». Corriger une contribution pour supprimer une information (année de construction erronée, loyer, servitude) ne l'efface donc jamais sur la fiche parcelle.

### 4. Zone déduite : cas résiduels après la refonte

- Changer de province vide la circonscription mais laisse la zone précédente active : le préfixe du numéro de parcelle peut rester incohérent jusqu'à ce qu'une nouvelle circonscription soit choisie.
- La remise à zéro du bloc Localisation conserve la zone quand elle avait été « auto-détectée », alors que la circonscription vient d'être effacée.
- Le message de validation cite encore la zone comme champ à remplir, alors qu'elle n'est plus saisissable : l'utilisateur ne peut pas agir dessus directement.

### 5. Recherche avancée : filtre inopérant

Le filtre « type de section » de la recherche avancée compare à des libellés qui n'existent dans aucune colonne (voir constat 1) : il renvoie toujours zéro résultat sans message.

## Correctifs

### Étape A — Uniformiser le type de section (base de données)
Une migration :
- Normalise la valeur à l'écriture dans les deux branches du déclencheur (`SU`/`urbain` → une seule convention retenue : `SU` / `SR`, déjà la plus répandue dans le code applicatif).
- Convertit les lignes existantes écrites en `urbain` / `rural`.
- Ajoute la circonscription foncière, l'état de la construction, l'autorisation précédente, l'usage réel, la capacité d'exploitation et le contrat de location à la création de parcelle, afin que le second déclencheur ne soit plus qu'un filet de sécurité.

### Étape B — Autoriser l'effacement d'une valeur
Passage des champs modifiables (année, loyer, capacité, servitude, environnement sonore, valeurs marchandes) à une écriture directe quand la contribution est de type « mise à jour », en conservant le comportement actuel pour les champs structurants (numéro, propriétaire, titre).

### Étape C — Cohérence de la zone dans le formulaire
- Vider la zone et le préfixe du numéro quand la circonscription est effacée (changement de province, remise à zéro du bloc).
- Reformuler le message de validation : demander la circonscription foncière, plus la zone.
- Aligner la remise à zéro du bloc Localisation sur la nouvelle source de vérité.

### Étape D — Recherche avancée
Faire correspondre le filtre de section aux valeurs réellement stockées, et afficher un message distinct entre « aucun résultat » et « la recherche a échoué ».

### Étape E — Tests et vérification finale
- Tests unitaires : normalisation du type de section, effacement d'une valeur en mise à jour, purge de la zone au changement de province.
- Vérification du parcours complet dans le navigateur (formulaire ouvert, navigation entre onglets, soumission) avec relevé des erreurs de console, en mobile et en bureau.
- Contrôle de types et suite complète de tests après chaque étape.

## Détails techniques

Base : `sync_approved_contribution_to_parcel` (branches INSERT et UPDATE), `sync_contribution_extra_fields_to_parcel`, colonne `cadastral_parcels.parcel_type`.
Front : `src/hooks/useCCCFormState.ts` (effets circonscription → zone, `resetLocationBlock`), `src/hooks/ccc/useFormValidation.ts`, `src/hooks/useAdvancedCadastralSearch.tsx`, `src/components/cadastral/tax-calculator/taxSharedUtils.ts`, `src/lib/pdf.ts`, `src/utils/analyticsHelpers.ts`.
Vérification : `npx tsgo --noEmit -p tsconfig.app.json` et `npx vitest run`.

Note : l'analyseur de sécurité de la base remonte 393 avertissements antérieurs à ce travail (fonctions `SECURITY DEFINER`, protection de mot de passe) ; ils ne sont pas traités ici sauf demande.
