

## Ajout du champ « Pied de page légal » dans l'onglet Identité

### Constat
L'onglet **Identité** (`CompanyLegalInfoForm`) regroupe les informations légales de l'entreprise (raison sociale, RCCM, NIF, adresse, contacts) mais n'expose aucun champ pour personnaliser le pied de page légal de la facture.

Aujourd'hui, le pied de page est édité dans l'onglet **Mise en page** via `config.footer_text` (table `invoice_template_config`). Cela crée une confusion : l'utilisateur cherche logiquement le footer dans Identité (car c'est du contenu légal/textuel), pas dans Mise en page (qui devrait rester dédié au visuel : couleurs, format, QR).

### Solution
Déplacer le champ **Texte du pied de page** de l'onglet Mise en page vers l'onglet Identité, et y ajouter un second champ **Conditions de paiement** (même logique : c'est du contenu légal, pas de la mise en page).

L'onglet Mise en page conservera uniquement les éléments visuels : couleurs, format par défaut, QR de vérification.

### Changements

**1. `CompanyLegalInfoForm.tsx`**
- Ajouter une nouvelle section **« Mentions légales de la facture »** en bas du formulaire (après les contacts).
- Deux `Textarea` :
  - Conditions de paiement (lié à `config.payment_terms`)
  - Texte du pied de page (lié à `config.footer_text`)
- Utiliser `useInvoiceTemplate()` pour accéder à `config`, `setConfigDraft`, `isConfigDirty`, `saveConfig`.
- Le bouton « Enregistrer » de l'onglet Identité sauvegarde à la fois `info` (via `saveInfo`) et `config` (via `saveConfig`) si l'un des deux est dirty.
- Badge « Modifications non enregistrées » déclenché si `isInfoDirty || isConfigDirty`.

**2. `InvoiceLayoutForm.tsx`**
- Retirer les blocs Conditions de paiement et Texte du pied de page.
- Conserver uniquement : couleurs (principale + secondaire), format par défaut, switch QR de vérification.
- Mettre à jour la `CardDescription` pour refléter le scope visuel pur.

**3. Aperçu temps réel**
- Aucune modification : `InvoicePreviewPanel` consomme déjà `config.footer_text` et `config.payment_terms` via le contexte partagé. L'aperçu se met à jour automatiquement quel que soit l'onglet d'édition.

### Hors scope
- Pas de migration SQL (les champs existent déjà dans `invoice_template_config`)
- Pas de changement du contexte `InvoiceTemplateContext` ni des hooks de fetch
- Pas de refonte visuelle des autres onglets

