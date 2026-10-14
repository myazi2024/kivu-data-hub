# Catalogue Données foncières (admin) : alignement et corrections

## Constat (vérifié)
- Le catalogue liste tous les visuels définis dans le code, même ceux masqués dans le menu Données foncières (21 visuels sont masqués dans les réglages Analytics). Ils restent donc proposés à la vente.
- Les titres affichés sont ceux du code, pas les titres personnalisés vus par les utilisateurs. Les noms diffèrent donc du menu.
- Aucune devise : les champs prix n'ont pas de symbole $ ni d'équivalent FC.
- Un prix négatif ou vide devient 0 ou NaN sans prévenir. Un visuel peut être « En vente » à 0 $ jusqu'à la sauvegarde.
- La durée par défaut peut être vidée et devenir 0.
- Si le catalogue enregistre bien, mais que la durée échoue (ou l'inverse), le message d'erreur ne dit pas lequel.
- L'ordre des visuels ne suit pas celui du menu.

## Corrections
1. **Alignement avec le menu** : le catalogue lit les réglages Analytics. Seuls les visuels visibles apparaissent, avec le même titre et dans le même ordre. Les onglets vides sont cachés.
2. **Visuels retirés** : une migration retire de la vente (« En vente » désactivé) tout visuel du catalogue qui n'est plus visible ou n'existe plus. Le serveur refuse aussi de les facturer (`create_analytics_visual_invoice` vérifie la visibilité). Aujourd'hui, aucune ligne de catalogue n'existe encore, donc rien n'est perdu.
3. **Devise** : chaque champ prix affiche « $ » et « USD ». En dessous, l'équivalent en FC est calculé avec le taux configuré. Le prix groupé par onglet indique aussi la devise. Les prix restent stockés en USD (règle du projet).
4. **Saisie** : les champs vides sont acceptés pendant la saisie. Les valeurs négatives ou invalides sont refusées avec un message. Activer « En vente » sans prix affiche l'erreur sur la ligne concernée.
5. **Sauvegarde** : un message précis indique ce qui a échoué (prix ou durée).
6. **Derniers achats** : montant affiché en USD avec le même format que le reste de l'application.

## Détails techniques
- `AdminAnalyticsCatalog.tsx` : source = `analytics_charts_config` (is_visible, custom_title, display_order) croisée avec le registre ; `useCurrencyConfig` + `formatCurrency` ; prix gérés en chaîne dans le brouillon, puis convertis à la sauvegarde.
- Migration : `UPDATE analytics_visual_catalog SET is_active=false` pour les lignes sans config visible, et garde de visibilité dans `create_analytics_visual_invoice`.
- Vérification : typecheck, tests, puis lecture serveur du catalogue.
