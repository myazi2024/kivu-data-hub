# Bilan de sécurisation des parcelles validées

## Analyse de la demande
Aujourd'hui, « Mes parcelles » liste seulement le numéro, la localisation et deux boutons. L'objectif : donner au propriétaire une mesure claire (0–100 %) du niveau de sécurisation juridique et documentaire de chaque parcelle, puis lui montrer ce qui manque pour l'améliorer.

Point clé : « sécurisation » ne doit pas être un simple taux de remplissage du formulaire. Un titre foncier enregistré pèse plus qu'une photo de façade. Le score est donc **pondéré** par critère, et calculé **côté serveur** (règle du projet : les calculs critiques ne se font pas dans le navigateur).

## Ce que verra l'utilisateur
Sur chaque carte de parcelle validée :
- Un **cercle gradué** 0–100 % avec le pourcentage au centre.
- Couleur selon le niveau : rouge (0–39 %), orange (40–59 %), jaune (60–79 %), vert (80–100 %), avec un libellé (« Faible », « Moyen », « Bon », « Excellent ») pour ne pas dépendre de la couleur seule.
- Animation douce de remplissage (désactivée si l'utilisateur préfère réduire les animations).

Au clic sur le cercle : une fenêtre (feuille du bas sur mobile) « Bilan de sécurisation » avec :
- Le score et le niveau.
- Critères groupés par thème, chacun avec son poids :
  - **Complétés** (coche verte)
  - **À compléter** (repère orange) + action « Compléter » qui ouvre la demande de modification pré-orientée.
- Une phrase de conseil : « Prochaine étape recommandée : … » (le critère manquant au plus fort poids).

## Critères proposés (pondération indicative, total 100)
| Thème | Critère | Poids |
|---|---|---|
| Droits | Titre de propriété renseigné (type + numéro) | 20 |
| Droits | Copie du titre téléversée | 10 |
| Droits | Aucun litige foncier en cours | 10 |
| Droits | Aucune hypothèque active (ou hypothèque déclarée) | 5 |
| Historique | Historique des propriétaires renseigné avec actes | 10 |
| Géométrie | Coordonnées / croquis des limites | 10 |
| Géométrie | Superficie déclarée | 5 |
| Construction | Autorisation de bâtir (si construit) | 10 |
| Fiscalité | Impôt foncier de l'année en cours déclaré/payé | 10 |
| Fiscalité | Aucun arriéré fiscal | 5 |
| Expertise | Expertise immobilière valide | 5 |

Les critères non applicables (ex. autorisation de bâtir pour un terrain nu) sont retirés du calcul et le score est ramené sur 100.

## Idées complémentaires proposées
1. **Résumé en tête de liste** : score moyen de toutes mes parcelles + nombre de parcelles « à risque ».
2. **Alertes** : notification quand une échéance fiscale approche, qu'un litige ou une revendication touche ma parcelle, ou que le score baisse.
3. **Coffre-fort documentaire** par parcelle : voir et télécharger mes justificatifs déjà fournis.
4. **Raccourcis services** depuis la carte : payer la taxe, demander un titre, une autorisation, une expertise, une mutation.
5. **Fiche parcelle imprimable** reprenant le bilan (avec code de vérification existant).
6. **Historique du score** : petite courbe montrant la progression.
7. **Filtres et tri** dans la liste (par score, par commune).

Je propose de livrer d'abord le bilan (cercle + détail + prochaine étape) et l'idée 1 ; les autres peuvent suivre selon vos priorités.

## Détails techniques
- Nouvelle fonction serveur `get_my_parcel_security_report(parcel_id)` (SECURITY DEFINER, `SET search_path = public`) vérifiant `owner_user_id = auth.uid()`, retournant score, niveau et liste `{key, theme, label, weight, done, applicable, action}`. Lit `cadastral_parcels`, la contribution liée, `cadastral_land_disputes`, `check_parcel_active_mortgage`, `cadastral_building_permits`, `cadastral_tax_history`, expertise valide. Aucun document ni donnée tierce renvoyé.
- `get_my_owned_parcels` enrichi d'un champ `security_score` pour afficher les cercles sans N requêtes.
- Front : composant `SecurityScoreRing` (SVG, tokens sémantiques ajoutés dans `index.css` pour les 4 niveaux), `ParcelSecurityReportDialog`, hook `useParcelSecurityReport`, intégrés dans `UserOwnedParcels.tsx`.
- Helper pur `getSecurityLevel(score)` + tests des seuils et de la renormalisation des critères non applicables.
