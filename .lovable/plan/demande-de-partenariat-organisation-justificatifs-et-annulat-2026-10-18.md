# Demande de partenariat : organisation, justificatifs et annulation

## Ce qui change pour l'utilisateur
Dans **Mon compte → Données foncières → Partenariat** (et sur la page Partenariat quand l'utilisateur est connecté) :

1. **Informations de l'organisation** : nom (obligatoire), type (entreprise, banque/institution financière, notaire/cabinet, administration publique, ONG, autre), numéro RCCM / identification nationale, adresse, ville, site web, personne de contact et sa fonction, téléphone, message de présentation.
2. **Documents justificatifs** : jusqu'à 5 fichiers (PDF, JPG, PNG, WebP, 10 Mo max chacun), par exemple RCCM, statuts, lettre de mandat. Fichiers privés, visibles uniquement par le demandeur et les administrateurs.
3. **Annuler une demande** : bouton « Annuler la demande » avec confirmation, disponible tant que la demande est « envoyée » ou « en examen ». Une fois acceptée ou refusée, l'annulation n'est plus possible. Statut affiché « Annulée » ; l'utilisateur peut ensuite refaire une demande.
4. Liste « Mes demandes » : détail dépliable (informations de l'organisation, documents consultables via lien temporaire).

Côté admin (gestion des demandes de partenariat existante) : affichage des nouvelles informations et des documents ; les demandes annulées ne peuvent plus être traitées.

## Détails techniques
- Migration `partner_inquiries` : colonnes `organization_type`, `registration_number`, `address`, `city`, `website`, `contact_role`, `phone`, `documents jsonb default '[]'` (liste de chemins), `cancelled_at`; statut `cancelled` ajouté aux valeurs admises.
- Bucket privé `partner-documents` ; politiques storage : dépôt/lecture/suppression par le propriétaire si le premier segment du chemin = `auth.uid()`, lecture admin/super_admin.
- RPC `submit_partner_inquiry(...)` SECURITY DEFINER, `search_path = public` : utilisateur connecté requis, validations serveur (longueurs, type autorisé, URL https, max 5 documents, chemins préfixés par `auth.uid()`), refus si une demande ouverte existe déjà ou si l'utilisateur est déjà partenaire, statut forcé `pending`.
- RPC `cancel_partner_inquiry(p_id)` : propriétaire uniquement, statut `pending`/`new`/`in_review` requis (garde serveur), passe à `cancelled` + `cancelled_at`, notifie les admins via `_notify` (clé `partner_inquiry:<id>:cancelled`).
- Trigger de garde : les admins ne peuvent pas changer le statut d'une demande annulée ; la notification de décision existante ignore `cancelled`.
- Front : `MyPartnership.tsx` découpé (`PartnerInquiryForm.tsx`, `PartnerInquiryItem.tsx`), upload avec `crypto.randomUUID()` et validation `validateFile`, liens signés pour la consultation, suppression des fichiers déposés si l'envoi échoue ; page Partenariat réutilise le formulaire si connecté ; écran admin affiche les nouveaux champs et documents.
- Tests : règle « annulation seulement si non décidée » et validation des fichiers (5 max, types/tailles).
