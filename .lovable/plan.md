

## Audit — Espace admin "Contenu"

### 1. Périmètre (4 vues, 4 tables, ~1 480 LOC)

| Vue | LOC | Table | Vol. BD |
|---|---|---|---|
| `AdminArticles` | 455 | `articles` | 20 (20 publiés) |
| `AdminArticleThemes` | 394 | `article_themes` | 10 actifs |
| `AdminPublications` | 414 | `publications` | 3 (2 publiés) |
| `AdminPartners` | 216 | `partners` | 5 actifs |

### 2. Anomalies critiques (P0 — bloquant / sécurité)

**A. RLS articles trop permissive (CRITIQUE).** Politique `"Authors can create articles" INSERT` avec `qual: NULL` → **n'importe quel utilisateur authentifié peut créer un article**. Combiné à `"Authors can update their own articles"`, un attaquant peut publier (`is_published=true`) et fixer `view_count` arbitraire. Aucune vérification de rôle (auteur officiel, journaliste, admin).
→ Restreindre INSERT à `has_role(auth.uid(),'admin')` OR `has_role(auth.uid(),'editor')`. Forcer `is_published=false` à la création pour non-admin via trigger.

**B. View_count incrémenté côté client (race + abus).** `useArticleBySlug` lit `view_count` puis fait `update view_count = current+1`. Race condition + manipulation triviale (refresh × N gonfle les vues). Aucune RLS UPDATE publique sur `articles` ne devrait permettre cela — vérifier : la politique `"Authors can update their own articles"` (auth.uid() = author_id) ne couvre pas l'anonyme, donc l'incrément échoue silencieusement pour les visiteurs non-auteurs. **→ tous les compteurs sont faux** (sauf si l'auteur lui-même visite).
→ RPC `increment_article_view(article_id)` SECURITY DEFINER avec rate-limit IP/session.

**C. Aucun trigger d'audit sur les 4 tables Contenu.** Modifications, suppressions logiques, changements `is_published/status` non tracés. Pattern `history_audit` déjà appliqué ailleurs (Historiques & Litiges) — non étendu ici.
→ Réutiliser la table `history_audit` existante via trigger générique `audit_content_changes` sur `articles`, `article_themes`, `publications`, `partners`.

**D. Suppression incohérente.**
- `AdminArticles.handleDelete` → soft delete (`deleted_at`).
- `AdminPublications.handleDelete` → hard delete (`.delete()`).
- `AdminPartners.handleDelete` → hard delete.
- `AdminArticleThemes` → **aucun bouton de suppression** (seulement toggle actif).
Incohérent : pas de récupération possible pour publications/partners ; orphelins potentiels (articles → thème supprimé impossible mais cascade non protégée).
→ Standardiser soft-delete partout + filtrer `deleted_at IS NULL` côté lecture.

**E. Publications : `content` jamais lu/édité.** Form a un champ `content` mais il n'est ni dans le payload `formData` envoyé (ligne 116, `update(formData)` sans `content` car filtré ?), ni rendu côté UI publique. Et `file_url` (colonne BD) **n'est jamais géré** dans l'admin → impossible d'attacher un PDF aux publications payantes. Les 3 publications en BD ont `file_url=NULL` malgré `download_count` exposé.
→ Ajouter upload fichier (bucket `publications`) + champ `cover_image_url` + intégration `content` (markdown).

### 3. Anomalies fonctionnelles (P1)

1. **Articles : pas d'upload image de couverture** — uniquement URL en clair (champ texte). Pas de bucket `articles` utilisé.
2. **Articles : pas de WYSIWYG** — `content` édité dans une `Textarea` brute (10 lignes). Pour 20 articles type "blog", c'est rédhibitoire.
3. **Articles : slug non unique vérifié côté front** — collision possible (`unique` constraint BD seul source de vérité, l'erreur Supabase n'est pas friendly).
4. **Articles : `author_name = user.email`** — fuite PII admin sur la page publique de l'article. Devrait être un nom d'affichage configurable.
5. **Publications : pas de tracking achat/téléchargement réel.** `download_count` jamais incrémenté (aucun trigger, aucun edge function). Les 3 publications affichent 0.
6. **Publications : catégories codées en dur** (`research/report/analysis/guide`) — pas de table `publication_categories` admin.
7. **Themes : réorder non atomique** (2 updates séquentiels lignes 161-169 sans transaction → état incohérent si la 2ᵉ échoue).
8. **Themes : pas de suppression** (seulement toggle), pas d'affichage du nombre d'articles liés (utile pour décider de désactiver).
9. **Partners : pas d'export, pas de filtrage** (5 partenaires aujourd'hui, mais standardisation manquante).
10. **Partners : reorder absent** (champ `display_order` éditable manuellement uniquement via dialog).

### 4. Manques (P2)

- **Hub "Contenu"** : agrégation des KPIs (articles publiés, brouillons, vues totales, publications, partenaires actifs, alertes contenu non révisé > 90j).
- **SEO articles** : pas de champ `meta_title/meta_description/og_image`. Slug auto-généré sans validation longueur/SEO.
- **Calendrier éditorial** : pas de `scheduled_at` (publication différée).
- **Modération commentaires/likes** : aucune interactivité publique.
- **Statistiques par thème** : pas de vue "vues totales par thème" / "article le plus lu / mois".
- **Publication payante → wallet/commande** : `price_usd` existe mais pas de lien vers le système de facturation unifiée.
- **Versioning article** : pas d'historique des versions du `content`.
- **Cron auto-archivage** : articles non vus depuis 12 mois → archivage proposé.

### 5. Plan d'implémentation par paliers

**(A) P0 (~2h, surtout SQL + petits patchs UI)**
- Migration RLS articles : INSERT/UPDATE réservés à `admin`+`editor`.
- RPC `increment_article_view(_article_id uuid)` SECURITY DEFINER + remplacement côté `useArticleBySlug`.
- Trigger générique `audit_content_changes` sur 4 tables → `history_audit`.
- Standardiser soft-delete `publications` + `partners` (ajouter colonne `deleted_at`, filtrer lectures).
- AdminPublications : ajouter upload `file_url` (bucket `publications`) + `cover_image_url`.

**(B) P0 + P1 (~4h)**
- A + uploader image couverture articles (bucket `articles`), WYSIWYG (Tiptap), validation slug unique côté front, `author_display_name` séparé de l'email, suppression bouton thème + warning si articles liés, transaction reorder atomique (RPC `swap_theme_order`), edge function `track_publication_download` incrémentant `download_count` + lien wallet.

**(C) Plan complet (~6h)**
- B + Hub Contenu (KPIs transverses), champs SEO (`meta_*`, `og_image`), `scheduled_at` + cron `publish_scheduled_articles`, vue stats par thème, table `publication_categories`, versioning `article_revisions`, cron auto-archivage 12 mois, reorder partners drag&drop.

### Question

Quel périmètre dois-je implémenter ?

- **(A) P0** — corrige les failles bloquantes (RLS articles, vues falsifiables, audit BD, soft-delete, upload publications).
- **(B) P0 + P1** — ajoute upload images, WYSIWYG, tracking téléchargements, ergonomie thèmes/partenaires.
- **(C) Plan complet** — ajoute hub Contenu, SEO, calendrier éditorial, versioning, catégories dynamiques.

