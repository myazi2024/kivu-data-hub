

# Audit — Page "Contributions CCC" (`/about-ccc`)

## Problemes identifies

### 1. Coordonnees de contact fictives (P0)

Les 3 liens de contact en bas de page (lignes 746-779) utilisent des numeros/email factices :

| Element | Valeur actuelle (FAUSSE) | Valeur correcte (depuis Footer/WhatsApp) |
|---|---|---|
| Telephone | `+243 123 456 789` | `+243 816 996 077` |
| WhatsApp | `wa.me/243123456789` | `wa.me/243816996077` |
| Email | `support@example.cd` | A confirmer (meme probleme sur `AboutDiscountCodes.tsx`) |

Le vrai numero `+243 816 996 077` est utilise partout ailleurs (Footer, WhatsAppFloatingButton, CadastralMap).

**Note** : La page `AboutDiscountCodes.tsx` (ligne 244) a le meme probleme avec le WhatsApp fictif.

### 2. Bouton "Commencer une recherche" pointe vers `/` au lieu de `/cadastral-map` (P0)

Ligne 785 : `<Link to="/">Commencer une recherche</Link>` redirige vers la page d'accueil. Selon la demande, il doit pointer vers `/cadastral-map` (la carte cadastrale).

### 3. Bouton "Voir mes codes CCC" pointe vers une route inexistante (P0)

Ligne 788 : `<Link to="/billing-dashboard">` — la route `/billing-dashboard` n'existe pas dans `App.tsx`. Le bouton doit pointer vers `/mon-compte?tab=contributions` pour acceder a l'onglet "Mes contributions" du dashboard utilisateur.

### 4. Lien "Retour au catalogue" incorrect (P2)

Ligne 32 : `<Link to="/">← Retour au catalogue</Link>` pointe vers l'accueil. Le texte dit "catalogue" mais renvoie a la home. Devrait pointer vers `/services` ou simplement dire "Retour a l'accueil".

## Corrections

| Fichier | Ligne(s) | Correction |
|---|---|---|
| `AboutCCC.tsx` | 747 | `tel:+243816996077`, affichage `+243 816 996 077` |
| `AboutCCC.tsx` | 758, 766 | `wa.me/243816996077`, affichage `+243 816 996 077` |
| `AboutCCC.tsx` | 771, 777 | Email a definir (ex: `contact@bfrdc.cd` ou autre) |
| `AboutCCC.tsx` | 785 | `<Link to="/cadastral-map">` |
| `AboutCCC.tsx` | 788 | `<Link to="/mon-compte?tab=contributions">Voir mes contributions</Link>` |
| `AboutCCC.tsx` | 32 | Texte "Retour a l'accueil" ou lien vers `/services` |
| `AboutDiscountCodes.tsx` | 244 | Meme correction WhatsApp `wa.me/243816996077` |

