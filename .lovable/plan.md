

# Audit detaille -- Prise en charge des cookies

## Architecture actuelle

L'application dispose de 3 couches :
- **`CookieManager`** (lib/cookies.ts) -- classe utilitaire CRUD pour `document.cookie`
- **`CookieProvider` / `useCookies`** (hooks/useCookies.tsx) -- contexte React gerant consentement + preferences
- **`CookieBanner`** (components/CookieBanner.tsx) -- interface utilisateur RGPD

Le consentement est verifie dans `useCart` et `useCadastralCart` avant de persister les paniers.

---

## Problemes identifies

### 1. Bug : `httpOnly` dans `document.cookie` (critique)
L'option `httpOnly` dans `CookieManager.set()` (ligne 41-43) est **impossible a definir cote client**. `document.cookie` ignore silencieusement `httponly`. L'option donne une fausse impression de securite et doit etre supprimee de l'interface.

### 2. Bug : `getAll()` coupe les valeurs contenant `=`
Ligne 79 : `cookie.trim().split('=')` ne prend que le premier `=`. Les cookies dont la valeur contient `=` (Base64, JSON encode) sont tronques. Il faut utiliser `split('=', 2)` ou `indexOf('=')`.

### 3. Race condition : preferences enregistrees apres consentement
Dans `handleAcceptAll` du banner :
```ts
updatePreferences({ essential: true, analytics: true, marketing: true });
giveConsent();
```
`updatePreferences` met a jour le state de facon **asynchrone** (useState), mais `giveConsent` est appele immediatement apres. L'ordre d'ecriture des cookies est correct (les deux appellent `CookieManager` directement), mais le state React `preferences` peut etre en retard.

### 4. RGPD : "Refuser" donne quand meme le consentement
`handleRejectAll` appelle `giveConsent()` apres avoir mis les preferences a false. Cela stocke `bic-consent=true` meme quand l'utilisateur refuse. Semantiquement, refuser devrait stocker `bic-consent=false` ou un etat distinct (`rejected`). Actuellement, apres rechargement, le banner ne reapparait pas car `consent !== null`.

### 5. RGPD : pas de moyen de modifier son choix apres coup
Une fois le banner ferme, il n'y a **aucun bouton** dans l'application pour rouvrir les parametres de cookies (pas de lien en footer, pas de page `/legal` avec un bouton de gestion). Le RGPD exige que le retrait du consentement soit aussi facile que son octroi.

### 6. RGPD : pas de lien vers la politique de confidentialite
Le banner ne contient aucun lien vers une page expliquant en detail quels cookies sont utilises, par qui, et pour combien de temps.

### 7. localStorage non conditionne au consentement
Au moins **15+ fichiers** utilisent `localStorage` directement sans verifier le consentement cookies :
- `useCCCFormState`, `usePermitRequestForm`, `useSubdivisionForm`, `useMortgageDraft`, `landTitleDraftStorage`, `useConfigHistory`, `usePersistentPagination`, etc.
Seuls `useCart` et `useCadastralCart` verifient le consentement. Les autres persistent des donnees utilisateur sans permission.

### 8. Pas de nettoyage du localStorage lors du refus
`revokeConsent()` supprime les cookies non-essentiels mais **ne vide pas le localStorage**. Les donnees de panier, brouillons de formulaires, et historiques y restent.

### 9. Preferences non consultees par le code metier
Les preferences `analytics` et `marketing` sont stockees mais **jamais lues** ailleurs dans le code. Il n'y a aucun script analytics ni pixel marketing conditionne a ces preferences. Le toggle est purement decoratif.

### 10. Duplication du code de verification du consentement
`useCart` et `useCadastralCart` dupliquent chacun une fonction `getConsentStatus()` locale au lieu d'utiliser le hook `useCookies` ou `CookieManager.getConsentStatus()`.

### 11. Valeur `maxAge` du consentement = 13 mois
La CNIL recommande un maximum de 13 mois pour la validite du consentement. Le code utilise `365 * 24 * 60 * 60` (exactement 12 mois), ce qui est conforme, mais il n'y a pas de mecanisme de re-demande apres expiration.

---

## Plan de corrections

### Fichier : `src/lib/cookies.ts`
- Supprimer l'option `httpOnly` de l'interface et de la methode `set()`
- Corriger `getAll()` pour gerer les valeurs contenant `=`

### Fichier : `src/hooks/useCookies.tsx`
- Ajouter une methode `clearAllStorage()` dans `revokeConsent()` qui nettoie aussi `localStorage`
- Exposer une fonction `reopenBanner()` pour permettre la reouverture du banner

### Fichier : `src/components/CookieBanner.tsx`
- `handleRejectAll` : appeler `revokeConsent()` au lieu de `giveConsent()` pour stocker `bic-consent=false`
- Ajouter un lien vers `/legal` dans le banner
- Corriger le race condition `updatePreferences` + `giveConsent` en les combinant

### Nouveau : bouton "Gerer les cookies" dans le footer / page Legal
- Ajouter un bouton persistant (footer ou page `/legal`) qui reouvre le banner de cookies

### Fichier : `useCart.tsx`, `useCadastralCart.tsx`
- Remplacer les fonctions `getConsentStatus()` dupliquees par `CookieManager.getConsentStatus()`

### localStorage conditionne (amelioration future)
- Creer un utilitaire `ConsentAwareStorage` qui wrappe `localStorage` en verifiant le consentement avant toute ecriture. A integrer progressivement dans les 15+ fichiers concernes.

## Volume
- 6 fichiers modifies, 1 nouvel utilitaire
- Complexite moderee, sans migration base de donnees

