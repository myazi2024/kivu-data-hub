# Espace utilisateur : achats Données foncières et partenariat

## Constat vérifié
- Le menu de l'espace utilisateur ne contient aucune rubrique liée aux Données foncières : pas de liste des visuels achetés, de leurs dates d'expiration, ni des factures du catalogue (`analytics_visual_invoices`). La rubrique « Factures » n'affiche que la facturation cadastrale.
- La demande « Devenir Partenaire » (`partner_inquiries`) n'est rattachée à aucun compte (pas d'identifiant utilisateur) : l'utilisateur ne peut pas suivre sa demande, et le statut partenaire accordé (rôle `partner`) n'apparaît nulle part dans son espace.
- Le tableau de bord ne signale ni les accès qui expirent bientôt, ni l'état de la demande de partenariat.

## Ce qui sera ajouté
Nouvelle catégorie de menu **Données foncières** :

1. **Mes accès** : visuels achetés groupés par onglet, statut (actif / expire bientôt / expiré), date d'expiration, jours restants, boutons « Ouvrir dans Données foncières » et « Renouveler » (ajoute les visuels au panier et ouvre le catalogue). Si l'utilisateur a un profil habilité ou partenaire : bandeau « Accès complet inclus », pas d'achat nécessaire.
2. **Mes achats** : historique des factures du catalogue (date, nombre de visuels, montant USD + équivalent FC, statut payé / en attente / annulé), détail des visuels de chaque facture, téléchargement du reçu, reprise du paiement d'une facture en attente.
3. **Partenariat** : statut actuel (non partenaire / demande envoyée / en examen / acceptée / refusée), historique de mes demandes, avantages de la formule, bouton « Devenir Partenaire » (vers la page Partenariat, qui rattache désormais la demande au compte connecté).

Compléments :
- Tableau de bord : indicateurs « Accès actifs » et « Expirent sous 7 jours », état de la demande de partenariat.
- Notification automatique 7 jours avant l'expiration d'un accès, et à la décision sur une demande de partenariat.
- Compteurs dans le menu (accès actifs).

## Détails techniques
- Migration : `partner_inquiries.user_id uuid` (nullable, demandes anonymes conservées), politique lecture propriétaire ; insertion depuis la page Partenariat remplit `user_id = auth.uid()` si connecté. RPC `get_my_partnership_status()` (SECURITY DEFINER, `search_path = public`) : rôle partner + dernières demandes de l'appelant.
- RPC `get_my_analytics_purchases()` : factures de l'appelant avec lignes et statut ; `get_my_analytics_access` étendu ou complété pour inclure les accès expirés (historique) sans rien ouvrir.
- Tâche planifiée quotidienne : notification `_notify` avec clé anti-doublon `analytics_access:<id>:expiring` ; notification à la décision admin sur une demande de partenariat via RPC transactionnelle.
- Reprise du paiement : réutilise `AnalyticsCheckoutDialog` avec la facture existante ; aucune insertion de paiement côté client.
- Nouveaux composants `src/components/user/land-data/` (`MyAnalyticsAccess`, `MyAnalyticsPurchases`, `MyPartnership`), entrées ajoutées dans `userDashboardConfig.ts` et `UserDashboard.tsx`, React Query partagé (`my-analytics-access`).
- Libellés des onglets via la config Analytics (titres et visibilité configurés), couleurs sémantiques, statuts EN en base.
