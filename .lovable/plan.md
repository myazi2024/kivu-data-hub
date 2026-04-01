

# Système de vérification d'authenticité des documents cadastraux

## Constat actuel

Les PDFs générés (rapport cadastral, factures, certificats, permis) contiennent tous un **QR code pointant vers des URLs inexistantes** :
- `https://bic.cd/verify-report/{id}` — aucune route
- `https://bic.cd/verify-permit/{id}` — aucune route
- `https://bic.cd/verify/{id}` — aucune route

Le `reportId` est généré côté client avec `Date.now() + Math.random()` et **n'est jamais persisté en base**. Le QR code est donc purement décoratif.

## Solution proposée

Créer un système complet de vérification en 3 parties :

### 1. Table `document_verifications` (migration SQL)

Stocke chaque document généré avec son ID unique, type, métadonnées et hash de contenu.

| Colonne | Type | Description |
|---|---|---|
| `id` | uuid | PK |
| `verification_code` | text unique | Code court (ex: `BIC-2026-A3F9K2`) |
| `document_type` | enum | `report`, `invoice`, `permit`, `certificate`, `expertise`, `mortgage_receipt` |
| `parcel_number` | text | Parcelle associée |
| `user_id` | uuid | Utilisateur ayant généré le document |
| `generated_at` | timestamptz | Date de génération |
| `metadata` | jsonb | Services payés, montants, etc. |
| `is_valid` | boolean | Permet l'invalidation admin |

RLS : lecture publique (pour la page de vérification), écriture authentifiée.

### 2. Page publique `/verify/:code` (nouvelle route)

Page accessible **sans authentification** qui :
- Accepte un code de vérification (saisi manuellement ou via QR code)
- Interroge `document_verifications` par `verification_code`
- Affiche : statut (valide/invalide), type de document, parcelle, date de génération, nom du bénéficiaire
- Affiche un badge visuel vert "Document authentique" ou rouge "Document non reconnu"

### 3. Persistance à la génération (modification `src/lib/pdf.ts`)

Modifier `generateCadastralReport` et `generateInvoicePDF` pour :
- Générer un `verification_code` lisible (ex: `BIC-2026-XXXX`)
- Insérer une ligne dans `document_verifications` avant de générer le PDF
- Utiliser le code persisté dans le QR code : `https://{origin}/verify/{code}`

### 4. Admin : liste des documents vérifiables

Ajouter dans l'espace admin une section pour consulter et invalider des documents.

## Fichiers impactés

| Fichier | Action |
|---|---|
| Migration SQL | Créer table `document_verifications` + enum + RLS |
| `src/lib/pdf.ts` | Persister le code avant génération, mettre à jour les URLs QR |
| `src/pages/VerifyDocument.tsx` | Nouvelle page publique de vérification |
| `src/App.tsx` | Ajouter route `/verify/:code` (publique) |
| `src/components/admin/AdminDocumentVerifications.tsx` | Panel admin pour consulter/invalider |

