

# Plan: Renommer "Obtenir une autorisation" → "Demander une autorisation" + Audit residuel

## Partie 1 — Renommage du label

Le label "Obtenir une autorisation" existe dans le fallback du hook `useParcelActionsConfig.tsx` (L93). La valeur en production est pilotee par la table `parcel_actions_config` en DB, donc il faut aussi mettre a jour la DB.

### Fichier impacte
- `src/hooks/useParcelActionsConfig.tsx` L93: changer `'Obtenir une autorisation'` en `'Demander une autorisation'`

### Mise a jour DB
- UPDATE de la table `parcel_actions_config` pour le `key = 'permit_request'`: mettre `label = 'Demander une autorisation'`

---

## Partie 2 — Audit residuel du service "Demander une autorisation"

### Constat global apres les corrections precedentes

Les problemes majeurs (desalignement cles JSON, admin incomplet, action "Renvoyer", stats DB, analytics dedie) ont deja ete corriges. L'audit actuel ne revele que des points mineurs :

### 1. AUCUNE DIVERGENCE CRITIQUE RESTANTE
- Les cles JSON sont alignees avec le helper `r()` et `getRequestType()`
- L'admin affiche les 26 champs collectes
- Les 3 actions (Approuver/Rejeter/Renvoyer) sont presentes
- Les stats utilisent la colonne DB `status`
- L'onglet analytics `building-permits` existe avec 11 graphiques et 5 KPIs

### 2. AUCUNE DONNEE FICTIVE
- Frais charges depuis `permit_fees_config` avec fallback ($75/$120)
- Stats admin calculees sur donnees reelles
- Taux de validite (36 mois) conforme a la legislation RDC

### 3. REDONDANCE CCC DEJA GEREE
- Pre-remplissage depuis `parcelData` (type, nature, usage, surface) via `usePermitRequestForm`
- Alerte visuelle "Certaines informations ont ete pre-remplies"
- Proprietaire actuel affiche dans le formulaire et l'admin

### 4. POINT MINEUR — Le label "Permis initial" dans le preview
Dans `PermitPreviewStep.tsx` L87, le label dit "Permis initial" au lieu de "Autorisation initiale" pour le champ `originalPermitNumber`. A corriger pour coherence terminologique.

### 5. POINT MINEUR — Texte "Permis périmé" dans les options de regularisation
Dans `PermitFormStep.tsx` L297, l'option de raison de regularisation dit "Permis périmé" au lieu de "Autorisation périmée". A corriger.

### 6. POINT MINEUR — Label "frais de permis" dans l'admin
Dans `PermitRequestDialog.tsx` L98/104, les messages d'erreur mentionnent "frais de permis" au lieu de "frais d'autorisation".

---

## Plan d'implementation

### Etape 1 — Renommer le fallback et mettre a jour la DB
- `useParcelActionsConfig.tsx` L93: `label: 'Demander une autorisation'`
- Requete SQL sur `parcel_actions_config`

### Etape 2 — Harmoniser la terminologie "Permis" → "Autorisation"
- `PermitPreviewStep.tsx` L87: "Permis initial" → "Autorisation initiale"
- `PermitFormStep.tsx` L297: "Permis périmé" → "Autorisation périmée"
- `PermitRequestDialog.tsx` L98/104: "frais de permis" → "frais d'autorisation"

### Fichiers impactes

| Fichier | Action |
|---------|--------|
| `src/hooks/useParcelActionsConfig.tsx` | Renommer label fallback |
| `src/components/cadastral/building-permit-request/PermitPreviewStep.tsx` | Terminologie |
| `src/components/cadastral/building-permit-request/PermitFormStep.tsx` | Terminologie |
| `src/components/admin/permits/PermitRequestDialog.tsx` | Terminologie |

4 fichiers modifies, 1 update DB. Corrections mineures uniquement — le service est deja bien structure.

