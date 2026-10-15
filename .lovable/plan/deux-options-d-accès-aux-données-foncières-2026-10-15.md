# Deux options d'accès aux Données foncières

## Objectif
Au clic sur **« Demander l'accès »**, proposer deux formules au lieu d'ouvrir directement le catalogue :

1. **Paiement à l'usage** (équivalent français de « Pay as you go ») — accès aux données foncières de base, visuel par visuel, via le catalogue existant.
2. **Devenir Partenaire** — en plus des données de base, accès aux données critiques (analyses des hypothèques, litiges fonciers, valeurs marchandes) ; renvoie vers la page **Partenariat** (`/partnership`) pour introduire une demande auprès de BIC.

## Refonte prévue

1. **Fenêtre de choix des formules**
   - Nouveau composant `AccessPlansDialog` ouvert par « Demander l'accès » : deux cartes côte à côte sur ordinateur, empilées sur mobile.
   - Carte **Paiement à l'usage** : description courte (données de base, paiement par visuel, sans engagement) + bouton « Choisir les visuels » qui ouvre le catalogue des données existant (`AnalyticsCatalogDialog`), sans navigation.
   - Carte **Devenir Partenaire** : description courte (données de base + hypothèques, litiges, valeurs marchandes) + bouton « Introduire ma demande » qui ferme la fenêtre et navigue vers `/partnership`.
   - Même cadre que le catalogue : fond assombri, pas de fermeture au clic extérieur, focus restauré sur le bouton d'ouverture, accessible au clavier.

2. **Enchaînement catalogue**
   - Depuis « Paiement à l'usage », le catalogue s'ouvre au-dessus de la fenêtre de choix (empilement correct) ; à sa fermeture, retour à la fenêtre de choix ou à la page selon le parcours, panier conservé.
   - Le bouton flottant « Acheter d'autres visuels » continue d'ouvrir directement le catalogue (utilisateur déjà acheteur), sans passer par le choix des formules.

3. **Cohérence d'accès**
   - Aucun changement des règles : le rôle `partner` fait déjà partie des profils habilités (accès complet après validation de la demande par BIC) ; la page Partenariat et son formulaire de demande existent déjà.
   - Aucun changement des tables, tarifs, RPC ou fonctions de paiement.

## Détails techniques
- Modifier `LandDataAccessGate.tsx` : remplacer l'ouverture directe d'`AnalyticsCatalogDialog` par le nouveau dialogue de choix.
- Créer `src/components/access/AccessPlansDialog.tsx` (Dialog shadcn, deux cartes, navigation via `useNavigate`).
- Réutiliser `AnalyticsCatalogDialog` en mode contrôlé (`open`/`onOpenChange`) pour l'empilement.
- Classes sémantiques uniquement ; tests unitaires sur le choix des formules (ouverture, navigation, catalogue).

## Vérification
- Tests : ouverture des deux options, navigation vers `/partnership`, ouverture du catalogue depuis « Paiement à l'usage », fermeture/restauration du focus.
- Contrôle visuel ordinateur et mobile (page sans scroll conservée).
- Vérifications authentifiées non possibles (Supabase externe, MFA admin) : signalées comme telles.
