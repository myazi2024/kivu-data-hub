# Audit 2FA (accès console admin)

## Bugs identifiés

### 1. `MfaGuardProvider` n'est jamais monté — CRITIQUE
`src/components/admin/security/AdminSecurityHub.tsx` appelle `useMfaGuard()`, mais aucun `<MfaGuardProvider>` n'enveloppe `<App />` ni la route `/admin`. Conséquence : dès l'ouverture du hub Sécurité, le hook lance `throw new Error('useMfaGuard must be used within <MfaGuardProvider>')` → écran blanc / ErrorBoundary.
De plus `requireAal2(reason)` (mémoire `mfa-admin-implementation-fr`) n'est utilisable nulle part, donc aucune action sensible n'est réellement re-protégée par un challenge AAL2.

### 2. `AdminMfaGate` n'offre PAS l'enrôlement quand `needEnroll` est vrai — CRITIQUE UX
Le composant affiche seulement une carte "Vérification à deux facteurs requise" + bouton "Retour à l'accueil". Aucun `<MfaEnrollDialog>` n'est rendu dans la branche `needEnroll`, alors que le texte dit "Suivez les étapes pour configurer…". Un admin sans facteur est donc bloqué en boucle : il doit deviner qu'il faut aller dans `/mon-compte` pour activer la 2FA avant de pouvoir revenir.

### 3. `MfaChallengeDialog` sans chemin de récupération
Si l'admin a perdu son authenticator (aucun facteur vérifié), le dialogue affiche "Aucun facteur 2FA actif" mais n'offre ni bouton d'enrôlement, ni contact support, ni déconnexion. L'utilisateur reste piégé sur la carte d'avertissement.

### 4. Pas de rafraîchissement JWT explicite après `verify` dans `MfaChallengeDialog`
`MfaEnrollDialog` appelle `supabase.auth.refreshSession()` après succès, mais `MfaChallengeDialog` non. `mfa.verify` met normalement à jour la session côté `supabase-js`, mais en cas de cache d'AAL côté client le composant peut conserver `currentLevel='aal1'` quelques secondes — il s'appuie uniquement sur `onAuthStateChange` + `mfa.refresh()`. Ajouter un `refreshSession()` explicite + `await mfa.refresh()` rend l'élévation déterministe et supprime un possible flicker de la carte d'avertissement.

### 5. `MfaChallengeDialog` ne réinitialise pas `factorId` à la réouverture
Le `useEffect` sur `[open]` reset `code`/`error` mais pas `factorId`. Si le user a supprimé/changé son facteur entre deux ouvertures, l'ancien `factorId` est utilisé jusqu'au retour de `listFactors` → `mfa.challenge` peut échouer avec "factor not found".

### 6. Verrouillage de fermeture côté `AdminMfaGate`
`onOpenChange={(o) => { if (needChallenge && !o) return; ... }}` empêche la fermeture pendant `needChallenge`. Mais `needChallenge` repasse à `false` dès que `mfa.loading` redevient `true` (pendant un `refresh()`), créant une micro-fenêtre où Échap/clic-overlay peut fermer le dialogue à tort. Verrouiller plutôt sur `mustGuard && currentLevel !== 'aal2'`.

### 7. `MfaChallengeDialog` n'a pas d'auto-submit ni de gestion clavier
Quand `code.length === 6` l'utilisateur doit cliquer "Valider". Mineure mais friction inutile pour le 2FA admin (toutes les autres apps auto-soumettent). Pas non plus de gestion `Enter`.

### 8. Pas d'anti-brute-force visible
Aucun cooldown / compteur d'échecs côté client. Si l'utilisateur saisit 10 codes faux, on appelle 10× `challenge`+`verify`. Supabase impose ses propres limites mais le composant ne le reflète pas (pas de message "trop de tentatives, réessayez dans …").

### 9. `MfaEnrollDialog` : nettoyage non garanti à l'unmount
Le `useEffect` de nettoyage ne s'exécute que sur changement de `open`. Si le composant est démonté (navigation) avec un facteur unverified, celui-ci reste orphelin dans `auth.mfa_factors`. Ajouter un cleanup au unmount.

### 10. `useMfaStatus` re-fetch sur chaque `onAuthStateChange`
Y compris `TOKEN_REFRESHED` et `USER_UPDATED`, ce qui déclenche 2 appels réseau toutes les ~1 h en idle. Filtrer sur `SIGNED_IN | SIGNED_OUT | MFA_CHALLENGE_VERIFIED`.

## Correctifs prévus

1. **Monter `<MfaGuardProvider>`** dans `src/App.tsx`, à l'intérieur de `<AuthProvider>` et au-dessus de `<Routes>` (ou au minimum englobant la route `/admin` et `/mon-compte`).
2. **`AdminMfaGate` : afficher `<MfaEnrollDialog>` quand `needEnroll`**, non fermable, avec `onEnrolled` qui rafraîchit `mfaStatus` puis bascule sur le challenge si nécessaire. Conserver la carte d'avertissement en arrière-plan, mais retirer le bouton "Retour à l'accueil" → remplacer par "Se déconnecter" + lien secours `/mon-compte → Sécurité`.
3. **`MfaChallengeDialog`** :
   - Reset `factorId` dans le `useEffect` sur `[open]`.
   - Après `verify` OK : `await supabase.auth.refreshSession()` puis `onSuccess()`.
   - Auto-submit dès `code.length === 6` (sauf si `loading`).
   - Bouton "Je n'ai plus accès à mon authenticator" → ouvre un `MfaEnrollDialog` (cas perte) ou déclenche un sign-out propre.
4. **`AdminMfaGate.onOpenChange`** : bloquer la fermeture sur `mustGuard && currentLevel !== 'aal2'` plutôt que sur `needChallenge`.
5. **`MfaEnrollDialog`** : cleanup au unmount via un second `useEffect(() => () => {…}, [])` qui unenroll le facteur si toujours unverified.
6. **`useMfaStatus`** : filtrer les events `onAuthStateChange` (`SIGNED_IN`, `SIGNED_OUT`, `MFA_CHALLENGE_VERIFIED`, `USER_UPDATED`).
7. **Tentatives échouées** : compteur local (3 échecs → cooldown 30 s côté UI + message clair).
8. Vérifier en preview : connexion admin sans facteur → flux d'enrôlement complet, puis connexion admin avec facteur → challenge → AAL2 → console accessible.

## Hors scope (à valider avec vous avant)
- Backup codes / facteur de secours (recovery codes Supabase).
- Politique de re-challenge périodique (forcer AAL2 toutes les N min sur actions sensibles).
- Branchement effectif de `requireAal2(reason)` sur les actions sensibles existantes (suppression user, purge test, export PII, etc.).
