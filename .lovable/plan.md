
## Fix — Facture catalogue de services : téléchargement KO, impression KO, mise en page à reconstruire

### Diagnostic

Trois défauts se cumulent sur la facture du catalogue de services :

1. **Impression encore cassée**
   - `CadastralInvoice` utilise `usePrintScope()`, mais la facture est rendue dans une modale/portal.
   - La règle actuelle de `src/index.css` cible surtout les enfants directs de `body`, ce qui ne couvre pas correctement le DOM réel d’un portal Radix.
   - Résultat : aperçu vide, partiel, ou structure d’impression incorrecte.

2. **Téléchargement PDF fragile**
   - Dans `src/components/cadastral/CadastralResultCard.tsx`, `handleDownloadPDF()` appelle `generateInvoicePDF(...)` sans `await`.
   - Il n’y a pas d’état de chargement ni de feedback utilisateur fiable.
   - Le payload transmis au générateur PDF est partiel, donc la génération peut être incohérente ou échouer silencieusement.

3. **Facture UI mal structurée**
   - `src/components/cadastral/CadastralInvoice.tsx` affiche un justificatif compact “mobile modal”, pas une vraie facture lisible.
   - Les infos de paiement reposent encore sur `localStorage`.
   - Les montants sont recalculés côté UI alors que la facture persistée doit rester la source de vérité.
   - Le rendu n’a pas la hiérarchie attendue pour un document officiel.

### Correctifs à appliquer

#### 1. Corriger le scope d’impression pour les portals
**Fichiers :**
- `src/index.css`
- `src/hooks/usePrintScope.ts`

Travaux :
- remplacer la logique d’impression trop dépendante de `body > *`
- rendre le scope compatible avec les modales Radix rendues dans un portal
- masquer correctement overlay, actions, boutons et chrome d’interface
- forcer un rendu papier propre :
  - fond blanc
  - pas de backdrop noir
  - pas d’ombres
  - pas de scroll interne
  - largeur/espacement lisibles sur A4

Objectif : la facture s’imprime correctement même si elle vit dans un portal.

#### 2. Refaire la structure visuelle de la facture écran
**Fichier : `src/components/cadastral/CadastralInvoice.tsx`**

Transformer la modale actuelle en document lisible avec sections claires :

- en-tête BIC / identité émetteur
- titre document + numéro de facture
- date d’émission / date de paiement
- bloc client
- bloc parcelle / zone / mode de paiement
- tableau des prestations
- bloc sous-total / remise / TVA / total
- bloc QR / vérification / mentions légales
- barre d’actions séparée, visible écran seulement

Améliorations de layout :
- typographie moins compacte
- meilleur espacement vertical
- vraie grille desktop
- tableau de services au lieu d’une simple liste de cartes
- suppression des éléments décoratifs qui gênent l’impression

#### 3. Utiliser la facture DB comme source de vérité
**Fichier : `src/components/cadastral/CadastralInvoice.tsx`**

Au lieu de charger seulement quelques champs, récupérer la facture payée complète et afficher :
- `invoice_number`
- `client_name`, `client_email`, `client_address`, `client_type`
- `payment_method`
- `search_date`, `created_at`, `paid_at`
- `original_amount_usd`, `discount_amount_usd`, `total_amount_usd`
- `currency_code`, `exchange_rate_used`
- `dgi_validation_code` si disponible
- `geographical_zone`

Règle métier :
- la DB pilote les montants affichés
- le catalogue sert seulement à enrichir les noms/descriptions des services liés à `selected_services`

#### 4. Supprimer la dépendance fragile à `localStorage`
**Fichier : `src/components/cadastral/CadastralInvoice.tsx`**

Retirer :
- la lecture de `currentCadastralInvoice`
- le fallback “Mobile Money ****”

La méthode de paiement affichée doit provenir de la facture persistée.  
Si certaines métadonnées de paiement ne sont pas stockées, afficher un libellé propre et neutre, sans inventer d’information.

#### 5. Fiabiliser le téléchargement PDF
**Fichier : `src/components/cadastral/CadastralResultCard.tsx`**

Refactor de `handleDownloadPDF()` :
- récupérer la facture complète
- construire un payload complet et cohérent pour `generateInvoicePDF()`
- `await generateInvoicePDF(...)`
- entourer d’un `try/catch`
- ajouter un état `isDownloadingInvoice`
- désactiver le bouton pendant la génération
- afficher un toast succès/erreur utile

Objectif :
- clic utilisateur = comportement visible
- pas d’échec silencieux
- PDF cohérent avec la facture affichée

#### 6. Harmoniser facture écran et facture PDF
**Fichiers :**
- `src/components/cadastral/CadastralInvoice.tsx`
- `src/lib/pdf.ts`

Aligner :
- numéro de facture
- client
- parcelle
- date
- méthode de paiement
- services
- sous-total / remise / TVA / total
- terminologie du document

Le PDF reste le livrable téléchargeable, mais la facture à l’écran doit en être une version fidèle.

#### 7. Ajouter les états UX manquants
**Fichiers :**
- `src/components/cadastral/CadastralInvoice.tsx`
- `src/components/cadastral/CadastralResultCard.tsx`

Prévoir :
- chargement facture
- erreur de chargement
- facture introuvable
- génération PDF en cours
- boutons désactivés pendant l’action
- message clair si aucune facture payée n’est disponible

### Validation attendue

#### Cas 1 — Impression
- ouvrir une facture après paiement
- cliquer sur “Imprimer”
- résultat attendu :
  - aperçu non vide
  - pas de fond noir
  - pas de boutons
  - document lisible et structuré
  - montants et services visibles

#### Cas 2 — Téléchargement PDF
- cliquer sur “Télécharger le justificatif”
- résultat attendu :
  - téléchargement déclenché
  - pas d’erreur silencieuse
  - toast cohérent si problème
  - PDF lisible et complet

#### Cas 3 — Cohérence métier
- même numéro de facture entre UI et PDF
- mêmes montants entre UI, PDF et DB
- mêmes services achetés
- méthode de paiement correcte
- infos client/parcelle correctes

#### Cas 4 — Non-régression
- impression de `CadastralDocumentView` toujours fonctionnelle
- impression de `ReviewTab` CCC inchangée
- génération du rapport cadastral non impactée

### Fichiers à modifier

- `src/index.css`
- `src/hooks/usePrintScope.ts`
- `src/components/cadastral/CadastralInvoice.tsx`
- `src/components/cadastral/CadastralResultCard.tsx`
- éventuellement `src/lib/pdf.ts` pour harmoniser le contrat de données facture

### Détail technique

```text
Bug impression actuel
modal/portal Radix
-> usePrintScope marque la cible
-> CSS print masque mal le reste du DOM
-> la cible imprimable n'est pas isolée correctement
-> impression vide ou dégradée

Flux corrigé
modal ouverte
-> body.print-scope-active
-> CSS compatible portal
-> seule la facture utile reste visible
-> rendu papier propre
```

```text
Bug téléchargement actuel
click download
-> fetch facture
-> generateInvoicePDF async non awaité
-> pas d'état loading
-> pas de feedback fiable

Flux corrigé
click download
-> loading on
-> fetch facture complète
-> await generateInvoicePDF
-> toast succès/erreur
-> loading off
```

### Hors périmètre

- pas de refonte du schéma `cadastral_invoices`
- pas de redesign global du catalogue de services
- pas de changement du moteur du rapport cadastral complet
- pas d’ajout d’un nouvel historique documentaire ici
