

## Édition complète du pied de page de la facture

### Constat
Dans l'onglet **Mise en page**, le champ « Texte du pied de page » ne pilote qu'une seule ligne du bloc « MENTIONS LÉGALES (DGI) » du PDF. Les 4 autres lignes sont en dur dans le code (`InvoicePreviewPanel.tsx` + générateur PDF) :
1. Phrase d'introduction (« Facture normalisée émise conformément… »)
2. Ligne émetteur (NIF / RCCM / ID-NAT / régime) — auto-générée depuis `company_legal_info`
3. Ligne TVA + conditions de paiement
4. Code de validation DGI — auto-généré
5. `config.footer_text` (seul champ éditable aujourd'hui)

L'utilisateur ne peut donc pas modifier la phrase d'intro ni la formulation de la mention TVA.

### Solution
Étendre le schéma de configuration pour exposer **chaque ligne textuelle du footer** comme un champ éditable indépendant, regroupés dans une nouvelle section dédiée de l'onglet **Mise en page**.

### Changements

**1. Schéma `invoice_template_config`** (migration SQL)
Ajouter 3 nouvelles clés de configuration (avec valeurs par défaut = textes actuellement en dur) :
- `footer_intro_text` — phrase d'intro (par défaut : « Facture normalisée émise conformément à la réglementation fiscale… »)
- `footer_tva_mention` — gabarit avec placeholder `{tva_rate}` (par défaut : « TVA appliquée au taux de {tva_rate}. »)
- `footer_show_emitter_line` — booléen pour masquer/afficher la ligne émetteur
- `footer_show_dgi_code` — booléen pour masquer/afficher la ligne « Code de validation DGI »

Le champ existant `footer_text` reste inchangé (ligne libre en bas).

**2. Type `InvoiceTemplateConfig` + defaults** (`useInvoiceTemplateConfig.ts`)
Ajouter les 4 clés au type et à `DEFAULT_INVOICE_TEMPLATE_CONFIG` avec leurs valeurs par défaut actuelles.

**3. UI — `InvoiceLayoutForm.tsx`**
Nouvelle section **« Pied de page (mentions légales)»** regroupant :
- Textarea **Texte d'introduction** (`footer_intro_text`)
- Textarea **Mention TVA** (`footer_tva_mention`) avec aide indiquant le placeholder `{tva_rate}` disponible
- Switch **Afficher la ligne émetteur (NIF/RCCM/ID-NAT)** (`footer_show_emitter_line`)
- Switch **Afficher le code de validation DGI** (`footer_show_dgi_code`)
- Textarea existant **Texte libre du pied de page** (`footer_text`) — renommer le label en « Ligne complémentaire libre » pour clarifier

Réordonner pour que toutes les options du footer soient visuellement regroupées.

**4. Aperçu — `InvoicePreviewPanel.tsx`**
Remplacer les chaînes en dur du bloc « MENTIONS LÉGALES » par les nouveaux champs config :
- Ligne 1 → `config.footer_intro_text` (fallback ancien texte si vide)
- Ligne 2 → conditionnée par `config.footer_show_emitter_line`
- Ligne 3 → `config.footer_tva_mention` avec `{tva_rate}` interpolé + `config.payment_terms`
- Ligne 4 → conditionnée par `config.footer_show_dgi_code`
- Ligne 5 → `config.footer_text` (inchangé)

Appliquer la même logique au mini-reçu pour les champs pertinents.

**5. Générateur PDF** (`src/lib/pdf/...`)
Répliquer exactement les mêmes substitutions dans le code générant le bloc footer du PDF A4 (et mini si applicable) afin que l'aperçu reste un miroir fidèle du document final.

### Sécurité & cohérence
- Pas de changement RLS : les nouvelles clés héritent de la policy existante de `invoice_template_config`.
- Audit log : déjà couvert par `bulk_update_invoice_template_config` dans `saveConfig`.
- Sanitisation : interpolation `{tva_rate}` simple par `String.replace`, pas d'eval.

### Hors scope
- Pas d'éditeur WYSIWYG (textareas suffisent).
- Pas de support multilingue du footer (FR uniquement, comme aujourd'hui).
- Pas de modification de `CompanyLegalInfoForm` (l'identité reste séparée du footer).

### Fichiers
- Migration SQL : insertion des 4 nouvelles clés par défaut dans `invoice_template_config`
- `src/hooks/useInvoiceTemplateConfig.ts` (type + defaults)
- `src/components/admin/invoice-template/InvoiceLayoutForm.tsx` (nouvelle section)
- `src/components/admin/invoice-template/InvoicePreviewPanel.tsx` (rendu dynamique)
- Fichier(s) du générateur PDF dans `src/lib/pdf/` (mêmes substitutions)

