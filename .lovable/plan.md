

## Fix — Boucle infinie d'enrôlement 2FA admin

### Problème

L'utilisateur active la 2FA, le facteur est créé et vérifié, **mais immédiatement supprimé** (logs Supabase : `factor_unenrolled` 1 seconde après `factor verified`). Le dialog se rouvre alors en boucle.

### Cause racine

Deux problèmes combinés :

1. **Double instance de `MfaEnrollDialog`** : à la fois dans `MfaGuardProvider` (global) et dans `AdminMfaGate` (route admin). Les deux écoutent `mustEnroll` et ouvrent/ferment indépendamment.

2. **Cleanup destructif sur fermeture** (`MfaEnrollDialog.tsx` lignes 38-44) : quand `open` passe à `false`, `enrollAbortedRef.current` est utilisé pour `mfa.unenroll(...)` — mais ce ref est défini **dès `enroll()`** (ligne 68) et seul le `verify()` réussi le remet à `null` (ligne 93). L'instance "fantôme" (celle de l'autre composant) ne voit JAMAIS le verify, garde le ref pointant sur le factor, et le supprime à la fermeture.

3. **AAL non élevé après enroll-verify** : Supabase reste en `aal1` après l'enrôlement initial → `AdminMfaGate` détecte `needChallenge = true` et ouvre le **challenge dialog**, ce qui force la fermeture de l'enroll dialog → déclenche le cleanup → suppression.

### Plan de correction

**1. Supprimer la duplication d'`MfaEnrollDialog`**

Dans `AdminMfaGate.tsx` : retirer entièrement le `<MfaEnrollDialog>` rendu localement. Garder uniquement la délégation à `MfaGuardProvider` (déjà global via `App.tsx`). Conserver `<MfaChallengeDialog>` car il est contextuel à la route admin.

**2. Sécuriser le cleanup d'`MfaEnrollDialog`**

Dans le `useEffect` lignes 38-44 :
- Avant d'appeler `unenroll`, vérifier via `listFactors()` que le facteur est encore en statut `unverified`. Si verified → ne PAS le supprimer (c'est qu'un autre flow l'a confirmé).
- Toujours remettre `enrollAbortedRef.current = null` après `setStep('done')` ET dans le reset d'ouverture pour éviter qu'un ancien id traîne entre montages.

**3. Élever automatiquement la session à AAL2 après enroll-verify**

Après `setStep('done')` :
- Appeler `mfa.refresh()` (déjà fait via `onEnrolled`) puis attendre.
- Auto-fermer le dialog après 1.5s (toast déjà visible) et déclencher manuellement un refresh de session : `supabase.auth.refreshSession()` pour que l'AAL passe à `aal2` (Supabase met à jour l'AAL à la prochaine génération de token JWT).
- Si malgré ça l'AAL reste `aal1`, `AdminMfaGate` ouvrira `MfaChallengeDialog` — ce qui est correct, l'utilisateur saisit son code une fois et termine en `aal2`.

**4. (Bonus) Supprimer le `mustEnroll` du `MfaGuardProvider` quand un dialog enroll est explicitement déjà fermé par l'utilisateur**

Pas nécessaire si #1 résout le conflit. À garder en réserve.

### Fichiers modifiés

- `src/components/auth/AdminMfaGate.tsx` — retirer `MfaEnrollDialog` et la state `enrollOpen` associée.
- `src/components/auth/MfaEnrollDialog.tsx` — cleanup conditionnel (vérif statut), reset systématique de `enrollAbortedRef`, auto-close + `refreshSession()` après succès.

### Validation post-fix

1. Connexion admin sans facteur → 1 seul dialog enroll (provenant du provider).
2. Scan QR + code → toast "2FA activée" → dialog se ferme tout seul après ~1.5s.
3. Logs Supabase : un seul `factor_verified`, **AUCUN** `factor_unenrolled` derrière.
4. La page `/admin` se débloque (soit directement aal2, soit via challenge instantané).
5. Reload `/admin` après logout/login → demande le code TOTP au login (challenge), pas un nouvel enroll.

### Hors périmètre

- Pas de changement Supabase Dashboard (TOTP déjà activé ✅).
- Pas de modification des autres composants MFA (`MfaChallengeDialog`, `useMfaStatus`).

