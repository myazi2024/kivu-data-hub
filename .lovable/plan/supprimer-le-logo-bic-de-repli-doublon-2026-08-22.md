# Supprimer le logo BIC de repli (doublon)

Le logo affiché par intermittence est l'image de repli `src/assets/bic-logo.png`, utilisée quand le logo configuré dans Admin > Apparence n'est pas encore chargé ou pas défini. Résultat : deux logos différents selon les pages et les moments.

## Objectif

Une seule source de vérité : le logo configuré (`logo_url`). Si aucun logo n'est configuré, aucune image n'est affichée (le nom de l'application est affiché seul).

## Modifications

- `src/components/ui/navigation.tsx` — retirer l'import et le repli ; n'afficher `<img>` que si `logo_url` existe.
- `src/components/Footer.tsx` — idem.
- `src/pages/Auth.tsx` — idem.
- `src/pages/PitchPartenaires.tsx` — le logo de repli y est utilisé en dur ; le remplacer par le logo configuré, masqué s'il est absent.
- `src/components/admin/analytics-config/GlobalWatermarkConfig.tsx` — aperçu du filigrane : afficher uniquement le logo configuré, sinon un message « Aucun logo configuré ».
- `src/components/visualizations/shared/chartCardShared.tsx` — supprimer le repli `'/bic-logo.png'` ; ne rendre le filigrane que si `logoUrl` est défini.
- Supprimer le fichier `src/assets/bic-logo.png`.

## Détails techniques

Aucune modification de base de données ni de logique métier. Les composants PDF/certificats utilisent déjà `fetchAppLogo()` (config uniquement) et ne sont pas touchés. Vérification par typecheck après suppression de l'asset pour s'assurer qu'aucun import ne subsiste.
