

# Audit du service "Demande de Lotissement" — Divergences et optimisations

## Divergences identifiées

| Problème | Détail | Impact |
|----------|--------|--------|
| **Prix en dur "20$" dans le bouton** | Le bouton "Soumettre (20$)" (ligne 234 du dialog) et le montant `submission_fee_usd: 20` (ligne 278 du hook) sont codés en dur. Il n'y a aucune lecture depuis une config admin (type `cadastral_services_config` ou table dédiée). | Si l'admin change le tarif, le code ne reflète pas le changement. |
| **`submission_payment_status: 'completed'` sans paiement** | Le hook `submit()` (ligne 282) insère directement `submission_payment_status: 'completed'` sans aucun flux de paiement réel (Mobile Money, Stripe, etc.). L'utilisateur ne paie jamais les 20$. | **Bug critique** — les frais de dossier ne sont jamais collectés. |
| **Référence non-unique** | `LOT-2026-XXXXX` est généré avec `Math.random()` (ligne 247). Pas de vérification d'unicité en base — collision possible. | Risque de doublon sur des volumes élevés. |
| **`as any` sur les requêtes Supabase** | Les appels `supabase.from('subdivision_requests' as any)` et `supabase.from('subdivision_lots')` utilisent `as any`, indiquant que ces tables ne sont pas dans les types générés. | Les erreurs de typage sont masquées ; pas d'autocomplétion. |
| **Motifs de lotissement incohérents** | Le formulaire propose des motifs en français libre ("Vente", "Succession / Héritage", etc.) tandis que l'admin affiche des clés anglaises (`sale`, `family_distribution`, `development`). Les labels ne correspondent pas. | L'admin ne reconnaît pas les motifs soumis par l'utilisateur. |
| **Validation step 1 incomplète** | `isStepValid('parcel')` vérifie uniquement `!!parentParcel`. Le demandeur (nom, téléphone) n'est pas validé — un utilisateur sans profil complet peut avancer. | Soumission possible avec des champs demandeur vides. |
| **Export PNG fragile** | `StepPlanView.handleExportPNG()` utilise `document.querySelector('#subdivision-canvas svg')` et `btoa(unescape(encodeURIComponent(...)))` — échoue silencieusement avec des caractères spéciaux (accents dans les noms de propriétaires). | L'export PNG peut produire une image cassée. |
| **Pas de brouillon / sauvegarde** | Si l'utilisateur ferme accidentellement le dialog après avoir conçu 10 lots, tout est perdu. Aucune sauvegarde intermédiaire. | Perte de travail significative. |
| **Espaces communs et servitudes jamais éditables** | Les types `SubdivisionCommonSpace` et `SubdivisionServitude` existent, sont passés au `StepPlanView`, mais aucune interface ne permet de les créer ou les modifier. Ils restent toujours `[]`. | Fonctionnalité morte. |

## Plan d'implémentation

### 1. Intégrer le paiement réel avant soumission

Ajouter une étape de paiement entre le récapitulatif et la soumission finale :
- Lire le tarif depuis `cadastral_services_config` (clé `subdivision`) ou une config admin dédiée au lieu du `20` en dur.
- Réutiliser le flux `CadastralBillingPanel` / `useCadastralPayment` existant pour collecter le paiement.
- Ne soumettre en base (`status: 'pending'`) qu'après confirmation du paiement.
- Retirer le texte "(20$)" du bouton, le remplacer par le montant dynamique.

### 2. Corriger la génération de référence

Remplacer `Math.random()` par un appel à une séquence SQL ou un UUID court côté serveur, garantissant l'unicité. Alternative : insérer d'abord sans référence, puis utiliser l'`id` retourné pour construire `LOT-2026-{id_court}`.

### 3. Harmoniser les motifs de lotissement

Utiliser des clés normalisées (`sale`, `inheritance`, `investment`, `construction`, `donation`, `family`, `commercial`, `other`) avec un mapping de labels FR partagé entre le formulaire et l'admin.

### 4. Renforcer la validation de l'étape 1

`isStepValid('parcel')` doit vérifier : `parentParcel` ET `requester.firstName` ET `requester.lastName` ET `requester.phone` non vides. Afficher un message d'erreur inline si les champs sont manquants.

### 5. Ajouter la sauvegarde brouillon

Sauvegarder automatiquement le plan en `localStorage` (clé `subdivision-draft-{parcelNumber}`) à chaque modification de lots/roads. Restaurer au réouverture du dialog avec un message "Brouillon restauré". Ajouter un bouton "Effacer le brouillon".

### 6. Activer l'édition des espaces communs et servitudes

Ajouter un onglet ou une section dans `StepLotDesigner` permettant de créer/éditer des espaces communs (type, nom, surface) et des servitudes (type, lots affectés, largeur). Utiliser les types existants `SubdivisionCommonSpace` et `SubdivisionServitude`.

### 7. Fiabiliser l'export PNG

Remplacer la sérialisation SVG manuelle par `html2canvas` (déjà utilisé ailleurs dans le projet pour la carte DRC). Cela gère correctement les polices, accents et styles CSS.

## Fichiers impactés

| Action | Fichier |
|--------|---------|
| Modifié | `src/components/cadastral/subdivision/hooks/useSubdivisionForm.ts` — Paiement dynamique, référence unique, validation renforcée, brouillon localStorage |
| Modifié | `src/components/cadastral/SubdivisionRequestDialog.tsx` — Intégration étape paiement, montant dynamique |
| Modifié | `src/components/cadastral/subdivision/steps/StepParentParcel.tsx` — Validation champs demandeur |
| Modifié | `src/components/cadastral/subdivision/steps/StepSummary.tsx` — Montant dynamique, motifs harmonisés |
| Modifié | `src/components/cadastral/subdivision/steps/StepLotDesigner.tsx` — Section espaces communs et servitudes |
| Modifié | `src/components/cadastral/subdivision/steps/StepPlanView.tsx` — Export PNG via html2canvas |
| Modifié | `src/components/admin/AdminSubdivisionRequests.tsx` — Labels motifs harmonisés |

