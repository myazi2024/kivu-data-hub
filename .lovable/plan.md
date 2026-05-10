# Audit — Soumission CCC : "Échec de l'envoi du document : Failed to fetch"

## Diagnostic

L'erreur affichée provient de `lastUploadErrorRef.current` dans `useCCCFormState.uploadFile()`. Le message brut **"Failed to fetch"** est un `TypeError` levé par l'API `fetch()` du navigateur — donc **côté réseau**, AVANT que la requête n'atteigne Supabase Storage.

Confirmation dans les logs console : au même moment, `supabase.auth._useSession()` lève aussi `TypeError: Failed to fetch`. → Toutes les requêtes vers `*.supabase.co` étaient injoignables (coupure réseau, switch wifi/data, throttling navigateur, extension/adblock, ou hibernation onglet).

### Ce qui n'est PAS en cause (déjà audité)
- ✅ RLS du bucket `cadastral-documents` : conforme (`${userId}/...`).
- ✅ Bucket privé, sans `file_size_limit` ni `allowed_mime_types` restrictifs.
- ✅ Validation client (10 Mo, types MIME) cohérente.
- ✅ Backend `submitContribution` (insert RLS direct) — non atteint car blocage à l'étape upload.
- ✅ Pas d'edge function impliquée dans l'upload.

### Bugs / faiblesses détectés
1. **Aucune logique de retry** sur les erreurs réseau transitoires de `supabase.storage.upload()` ni de `createSignedUrl()`. Une micro-coupure (1-2 s) tue toute la soumission et oblige l'utilisateur à recommencer N uploads.
2. **Message technique brut affiché** ("Failed to fetch") — incompréhensible pour l'utilisateur final, qui ne sait pas que c'est un problème de connexion local.
3. **Pas de pré-check de connectivité / session avant la rafale d'uploads**. Si la session est expirée mais le token pas encore rafraîchi, le premier upload échoue avec un message ambigu.
4. **Pas de timeout** : si la requête fetch reste pendante (réseau dégradé), l'utilisateur attend indéfiniment avec spinner.
5. **Pas de garantie d'ordre** sur les uploads parallèles (`Promise.all` dans `taxRecords` / `mortgageRecords`) — en cas d'échec partiel, le tracker rollback OK mais le toast n'indique pas lequel a échoué.
6. **`navigator.onLine === false`** non testé en amont — on pourrait éviter l'appel et afficher tout de suite "Vous êtes hors ligne".

## Plan de correction

### 1. `src/hooks/useCCCFormState.ts` — Hardening de `uploadFile`
Ajouter un wrapper de retry + messages humains :

- **Pré-checks** :
  - Si `!navigator.onLine` → toast immédiat "Connexion internet indisponible" et `return null`.
  - Refresh proactif de la session via `supabase.auth.getSession()` (déjà fait en partie pour `userId`).
- **Retry réseau** : envelopper `storage.upload()` ET `createSignedUrl()` dans un helper `withRetry(fn, { retries: 2, delayMs: 800, backoff: 2 })`. Ne retry **que** sur erreurs réseau identifiées :
  - `error instanceof TypeError && /failed to fetch|network/i.test(error.message)`
  - `error.message` contenant `fetch`, `network`, `timeout`, `ETIMEDOUT`.
  - **Ne pas** retry les erreurs RLS / 4xx (pour éviter de masquer un vrai problème de policy).
- **Timeout** : utiliser `AbortController` avec 60 s par tentative pour empêcher un upload pendant.
- **Messages utilisateurs traduits** (mapping côté `lastUploadErrorRef`) :
  - "Failed to fetch" → "Connexion internet interrompue. Vérifiez votre réseau et réessayez."
  - "row violates row-level security" → "Permission refusée. Reconnectez-vous puis réessayez."
  - "exceeded the maximum allowed size" → "Fichier trop volumineux."
  - défaut → message Supabase brut (debug).

### 2. `src/hooks/useCCCFormState.ts` — Toast plus utile au point d'appel (`handleSubmit`)
Quand un upload échoue, ajouter dans la description :
- Le **type** du document concerné ("Document du propriétaire", "Reçu de taxe 2024", etc.) — déjà partiellement fait, à uniformiser.
- L'instruction "Cliquez sur Soumettre à nouveau, vos données sont conservées" (les fichiers sont rollback mais le formulaire reste rempli).

### 3. `src/hooks/ccc/useFormPersistence.ts` — Sauvegarde forcée AVANT rafale upload
Appeler `saveFormDataToStorage()` juste avant le premier `uploadFile()` dans `handleSubmit`, pour garantir qu'une coupure réseau n'effacera jamais le brouillon (le debounce 1500 ms peut ne pas avoir tiré).

### 4. (optionnel, hors-périmètre si trop large)
Ajouter un **listener global** `window.addEventListener('online'/'offline')` dans `useAuth` pour suspendre les actions de soumission quand offline et notifier le bandeau global. À évaluer si l'utilisateur le souhaite — non inclus par défaut dans cette correction.

## Hors-périmètre
- Pas de migration SQL : RLS + bucket sont conformes.
- Pas de modification du backend `submitContribution` (non atteint dans ce bug).
- Pas de modification des autres formulaires (subdivision/mutation) — pattern à propager dans un audit séparé si l'utilisateur le demande.

## Vérification post-fix
1. Couper le wifi 2 s pendant la soumission → upload doit retry et réussir au 2ᵉ essai.
2. Couper le wifi durablement → toast "Connexion internet interrompue", brouillon préservé.
3. Tester upload normal (gros fichier 8 Mo, PDF) → succès sans régression.
4. Forcer une erreur RLS (manipuler le path) → message clair sans retry inutile.
