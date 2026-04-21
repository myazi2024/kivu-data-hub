---
name: Invoice aging & recovery
description: Balance âgée factures impayées (vue invoices_aging, buckets 30/60/90), table invoice_reminders enrichie, due_date auto, UI AdminInvoiceReminders avec KPI buckets + bulk + export CSV
type: feature
---

## Recouvrement & balance âgée (Lot 3)

### DB
- `cadastral_invoices.due_date` (timestamptz) + trigger `set_invoice_due_date` (défaut config `invoice_payment_terms_days` = 30j)
- `invoice_reminders` enrichie : ajout `sent_at`, `sent_by_name`, `template_used`, `note` (compatibilité avec colonnes legacy `reminder_number`, `recipient`, `subject`, `status`)
- Vue `invoices_aging` (security_invoker) : factures non payées + `days_overdue` + `aging_bucket` (`current`/`30_60`/`60_90`/`over_90`) + compteur relances
- Config `invoice_payment_terms_days` dans `cadastral_search_config`

### UI `AdminInvoiceReminders` (refonte complète)
- 4 cartes KPI cliquables par bucket (montant total + nb factures), filtre actif au clic
- Recherche texte (facture/client/email), filtre bucket via Select
- Sélection multi + bouton « Relancer N sélection(s) »
- Export CSV de la balance filtrée
- Action ligne : relance unitaire ; numéro de relance auto (`first_reminder` → `second_reminder` → `final_notice`)
- Edge function `send-invoice-reminder` : actuellement log + trace BD (TODO : brancher email réel)

### Hors périmètre
- Email réel (Lovable Email / Resend) — branché plus tard
- SMS / WhatsApp (channel préparé mais manuel)
- Intérêts de retard, mises en demeure légales
