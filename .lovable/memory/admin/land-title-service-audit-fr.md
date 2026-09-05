---
name: Audit service titre foncier
description: Frais/paiement titre foncier calculés et confirmés côté serveur, bucket privé land-title-documents, RPC d'annulation, garde-fou approbation
type: feature
---

# Service « Demander un titre foncier » — durcissement

- Frais et `total_amount_usd` calculés par `public.calculate_land_title_fees(label, section_type, area_sqm)` (+ `map_land_title_type_key`), appliqués par le trigger `enforce_land_title_request_insert` : le montant envoyé par le client est ignoré.
- `enforce_land_title_request_update` fige pour l'utilisateur `payment_status`, `total_amount_usd`, `fee_items`, `paid_at`, `payment_id`, `status`, `reviewed_*`. Interdit `status='approved'` si `payment_status <> 'paid'` (y compris pour l'admin et le service role).
- Policy UPDATE utilisateur avec `WITH CHECK` (pending + non payé). Annulation via RPC `cancel_land_title_request(uuid)`.
- `markRequestPaid` supprimé : le paiement est confirmé uniquement par `process-mobile-money-payment` (branche `land_title_request` avec recalcul serveur du montant) ou `stripe-webhook`.
- Documents : bucket privé `land-title-documents`, chemin `${user.id}/<dossier>/...`, plus de repli sur un bucket public. Lecture via `getLandTitleDocumentUrl()` (URL signée 1h) côté admin.
- `MobileMoneyPayment`/`usePayment.createPayment` acceptent `paymentType` / `invoiceId` / `successMessage` (plus de `payment_type: 'publication'` codé en dur).
- Admin : l'action « Traiter » est accessible même si la demande n'est pas payée (rejet/mise en examen), l'approbation restant bloquée sans paiement.
