# Audit — Gestion du formulaire CCC dans l'espace admin

Le formulaire CCC a beaucoup évolué (configuration locative mono/multi-locaux, capacité par local, onglet Valeur marchande, annonces avec images, expertise récente). Côté admin, ces évolutions n'ont pas été répercutées. Voici les écarts constatés et les correctifs proposés.

## Constats vérifiés

1. **Données locatives et valeur marchande invisibles en admin.** Les colonnes `rental_configuration`, `rental_units_count`, `rental_units`, `monthly_rent_usd`, `resale_price_amount/currency/usd`, `has_recent_appraisal`, `appraisal_date`, `appraisal_report_url`, `market_listings` existent bien en base, mais aucune n'est affichée dans `CCCDetailsDialog.tsx` (recherche sur le fichier : aucune occurrence). L'admin approuve donc sans voir la partie locative multi-locaux ni la valeur marchande.
2. **Typage admin obsolète.** `ccc/types.ts` ne déclare aucun de ces champs : ils sont perdus au niveau TypeScript même s'ils arrivent via `select('*')`.
3. **Score de complétude désaligné.** `cccCompleteness.ts` compte 20 champs et ignore totalement le bloc locatif et l'onglet Valeur marchande — le score affiché sous-estime les contributions récentes.
4. **Approbation en masse incohérente avec l'approbation unitaire.** `bulkApprove` fait un simple `update` : pas d'appel à `validate_contribution_completeness`, pas de `verified_by/verified_at`, et surtout **aucune insertion des historiques** (propriété, bornage, taxes, permis, hypothèques) que fait `handleApprove`. Deux contributions approuvées par deux chemins différents ne produisent pas les mêmes données.
5. **Historiques insérés en boucle non atomique.** Chaque entrée est un `insert` séparé ; en cas d'échec partiel la contribution reste approuvée avec des historiques incomplets (simple `toast.warning`).
6. **Validation serveur trop pauvre.** `validate_contribution_completeness` ne contrôle que 5 champs et calcule le score uniquement à partir du nombre d'avertissements ; rien sur la cohérence locative (mode multi sans locaux, somme des loyers, capacité) ni sur les annonces.
7. **Rejet en masse via `window.prompt`** — hors design system, non accessible, non thématisé.
8. **Export CSV appauvri** : 9 colonnes, sans loyer, mode locatif, prix de revente ni score de complétude.
9. **Filtres/recherche limités** : pas de filtre par province/statut de complétude ni par période ; le filtre `user` fonctionne sur l'UUID brut.
10. **Chargement intégral côté client** : toutes les contributions sont récupérées par lots de 1000 puis filtrées/paginées en mémoire, alors qu'un compteur + filtres serveur suffiraient.

## Correctifs proposés

### A. Rendre visibles les nouvelles données (priorité 1)
- Étendre `ccc/types.ts` avec les champs locatifs et valeur marchande.
- Ajouter dans `CCCDetailsDialog.tsx` :
  - Dans l'onglet « Env. & Occup. » : mode de location (un seul local / plusieurs locaux), nombre de locaux, tableau des locaux (nom, étage, loyer USD, occupé, capacité, date de mise en location), total mensuel et annuel recalculés, cohérence avec `monthly_rent_usd`.
  - Un nouvel onglet « Valeur marchande » : prix de revente (montant + devise + équivalent USD), expertise récente avec date et lien vers le rapport, liste des annonces (`market_listings`) avec vignette de couverture, loyer demandé, charges, contact.
- Signaler les incohérences détectables (mode multi sans locaux, somme des loyers ≠ loyer déclaré, annonce sans image de couverture) par un badge d'alerte dans le dialogue.

### B. Aligner le score de complétude
- Ajouter au calcul de `cccCompleteness.ts` les critères locatifs et valeur marchande, en pondérant conditionnellement (les critères locatifs ne comptent que si `declared_usage = location`).

### C. Fiabiliser l'approbation
- Extraire la logique d'approbation (statut + historiques + hypothèques) dans un helper unique, utilisé à la fois par `handleApprove` et `bulkApprove`.
- Faire passer le bulk par `validate_contribution_completeness` et ignorer/rapporter les contributions invalides au lieu de les approuver en aveugle.
- Remplacer les boucles d'insert par des inserts groupés (un `insert` par table avec un tableau de lignes) pour réduire les allers-retours et les échecs partiels.
- Remplacer le `window.prompt` du rejet en masse par un `AlertDialog` avec `Textarea` (motif obligatoire).

### D. Enrichir la validation serveur
- Mettre à jour `validate_contribution_completeness` (migration) : contrôles supplémentaires sur le mode locatif (nombre de locaux cohérent, loyers > 0), sur la présence d'une image de couverture pour chaque annonce, et sur la date d'expertise (non future). Le score de complétude serveur sera calculé sur le même barème que le front.

### E. Confort admin
- Export CSV enrichi : mode locatif, nombre de locaux, loyer mensuel total, prix de revente USD, expertise, score de complétude.
- Filtre supplémentaire par province et par plage de dates dans `CCCFilters`.
- Afficher le nom du contributeur (via `profiles`) plutôt que l'UUID dans le tableau et le filtre.

## Détails techniques

Fichiers concernés : `src/components/admin/ccc/types.ts`, `cccCompleteness.ts`, `CCCDetailsDialog.tsx`, `CCCFilters.tsx`, `CCCContributionsTable.tsx`, `src/components/admin/AdminCCCContributions.tsx`, plus une migration pour `validate_contribution_completeness`. Aucune modification du formulaire côté utilisateur n'est nécessaire : les colonnes sont déjà présentes en base.

Ordre d'exécution suggéré : A → B → C → D → E, chaque étape étant indépendamment livrable.
