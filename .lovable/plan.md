

## Plan — Aperçu en temps réel (synchronisation Identité / Fiscalité / Mise en page → Aperçu)

### Constat

Chaque onglet utilise sa propre instance de hook :
- `CompanyLegalInfoForm` → `useCompanyLegalInfo()` (état local)
- `InvoiceFiscalSettingsForm` → `useInvoiceTemplateConfig()` (état local)
- `InvoiceLayoutForm` → `useInvoiceTemplateConfig()` (état local)
- `InvoicePreviewPanel` → `useInvoiceTemplateConfig()` + `useCompanyLegalInfo()` (autres instances)

Conséquence : modifier un champ dans **Identité** / **Fiscalité** / **Mise en page** met à jour uniquement l'état local de cet onglet. L'**Aperçu** ne voit le changement qu'après clic sur « Rafraîchir » (refetch DB) ou rechargement, **et seulement après sauvegarde**. Aucune synchronisation live, aucun aperçu pendant la saisie.

### Objectif

Toute modification (saisie en cours **et** sauvegarde) dans Identité, Fiscalité ou Mise en page se reflète **immédiatement** dans l'Aperçu, sans bouton Rafraîchir, sans rechargement.

### Approche — État partagé via React Context + draft live

#### 1. Créer `InvoiceTemplateContext`

Nouveau fichier `src/contexts/InvoiceTemplateContext.tsx` qui :
- Charge une seule fois `InvoiceTemplateConfig` et `CompanyLegalInfo` depuis la DB
- Expose `config`, `info`, `loading`, et deux setters de **draft live** :
  - `setConfigDraft(patch: Partial<InvoiceTemplateConfig>)` — applique en mémoire instantanément
  - `setInfoDraft(patch: Partial<CompanyLegalInfo>)` — idem
- Expose `saveConfig()` / `saveInfo()` qui persistent le draft en DB (réutilisent la logique existante `updateMany` / l'upsert de `useCompanyLegalInfo`)
- Expose `revertConfig()` / `revertInfo()` (revient au dernier état persisté si l'utilisateur quitte sans sauver)
- Garde un flag `isDirty` par section pour avertir avant changement d'onglet non sauvé

Le provider est monté dans `AdminInvoiceTemplate` (au-dessus des Tabs), donc partagé par tous les onglets.

#### 2. Refactorer les 3 formulaires pour consommer le contexte

`CompanyLegalInfoForm`, `InvoiceFiscalSettingsForm`, `InvoiceLayoutForm` :
- Supprimer leur propre `useState` + `useEffect` de hydratation
- Lire les valeurs depuis `context.config` / `context.info`
- Sur `onChange` d'un champ : appeler `setConfigDraft({ field: value })` (ou `setInfoDraft`) au lieu d'un setState local → l'Aperçu voit le changement à la frappe
- Le bouton **Enregistrer** appelle `saveConfig()` / `saveInfo()` qui persiste le draft, garde le state, montre toast

#### 3. Refactorer `InvoicePreviewPanel`

- Supprimer ses appels `useInvoiceTemplateConfig()` / `useCompanyLegalInfo()` indépendants
- Lire `config` et `info` depuis le contexte → tout changement de draft re-render l'aperçu instantanément
- Conserver son propre state local pour : variants (clientType/status/discount), facture sélectionnée, logo cache, QR
- Le bouton **Rafraîchir** force un `reload()` du contexte (utile uniquement pour récupérer des modifs externes)

#### 4. Indicateurs visuels « non sauvegardé »

- Ajouter un badge `Modifications non enregistrées` à côté du bouton Enregistrer de chaque onglet quand `isDirty=true`
- Avertir (toast ou confirm) si l'utilisateur change d'onglet ou ferme le panneau avec des changements non sauvegardés (optionnel, recommandé)

#### 5. Logo en temps réel

Quand `info.logo_url` change dans le draft, `InvoicePreviewPanel` doit re-télécharger le logo pour l'aperçu :
- `useEffect([info.logo_url])` → refetch via `fetchAppLogo()` ou `fetch(info.logo_url) → base64`
- L'aperçu A4 et Mini affichent le nouveau logo immédiatement après upload

#### 6. Champs concernés par la synchro live

**Identité** (`CompanyLegalInfo`) : legal_name, trade_name, rccm, id_nat, nif, tva_number, tax_regime, address_line1/2, city, province, phone, email, logo_url, bank_name/account/swift  
**Fiscalité** (`InvoiceTemplateConfig`) : tva_rate, tva_label, show_dgi_mention, invoice_number_prefix  
**Mise en page** : header_color, secondary_color, footer_text, payment_terms, show_verification_qr, default_format

Tous doivent être projetés dans l'Aperçu A4 et Mini sans délai.

### Détail technique

```text
Avant
[Identité form] ── useState local ── (Save) ── DB
[Fiscalité form] ── useState local ── (Save) ── DB
[Layout form] ── useState local ── (Save) ── DB
[Aperçu] ── useState (autre instance) ── refetch manuel

Après
                ┌── InvoiceTemplateProvider ──┐
                │  config, info (live draft)  │
                ├──────────────┬──────────────┤
[Identité] ─────┤ setInfoDraft │              │
[Fiscalité] ────┤              │ setConfigDraft
[Layout] ───────┤              │              │
[Aperçu] ◄──────┴── lit config/info live ─────┘
                           ▲
                           │ Save() → DB persist
```

### Critères de validation

1. Onglet **Identité** : taper dans `legal_name` → l'aperçu (visible après bascule onglet) montre le nouveau nom à la frappe
2. Onglet **Fiscalité** : changer `tva_rate` 16 → 18 → l'aperçu recalcule TVA et bandeau total instantanément
3. Onglet **Mise en page** : changer `header_color` via colorpicker → bandeau et titres de l'aperçu virent en live
4. Toggle `show_dgi_mention` / `show_verification_qr` → bloc/QR apparaît ou disparaît instantanément
5. Upload nouveau logo → aperçu A4 et Mini affichent le nouveau logo sans rafraîchir
6. Bouton **Enregistrer** : persiste en DB, badge `non sauvegardé` disparaît
7. Bouton **Rafraîchir** dans Aperçu : recharge depuis DB (utile si changement externe)
8. Quitter un onglet avec modifs non sauvegardées : avertissement visuel/toast

### Hors périmètre

- Pas de synchro multi-utilisateurs (Realtime Supabase)
- Pas de versioning / historique des modifications
- Pas d'autosave (sauvegarde manuelle conservée)
- Pas de modification du schéma DB

