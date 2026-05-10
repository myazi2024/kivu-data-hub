# Audit — Soumission CCC bloquée par "Erreur de téléchargement"

## Cause racine identifiée

Le bucket `cadastral-documents` a été passé en **privé** avec une RLS stricte :

```sql
INSERT policy "Users can upload their own documents":
  bucket_id = 'cadastral-documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
```

→ Le **premier segment** du chemin DOIT être l'`user.id`.

Mais `src/hooks/useCCCFormState.ts` (`uploadFile`, ligne 276) écrit toujours :

```ts
const filePath = `${path}/${fileName}`;
// ex: "owner-documents/uuid.pdf"  ← refusé par RLS
```

Conséquence : `supabase.storage.upload` retourne une erreur RLS → `uploadFile` renvoie `null` → toast **"Impossible de télécharger le document du propriétaire"** et la soumission s'arrête. Le même bug touche aussi tous les autres uploads du formulaire (titre, reçus taxes, hypothèques, autorisations, plans/photos d'autorisation), mais la première étape échoue avant qu'on les voie.

C'est une régression : `StepDocuments.tsx` (subdivision) et `useCadastralPayment` utilisent déjà `${userId}/...`. Seul `useCCCFormState` n'a pas été migré.

## Bugs additionnels détectés pendant l'audit

1. **Toast trompeur** — le titre "Erreur de téléchargement" parle d'un upload réussi côté UX. À renommer "Erreur d'envoi" / "Échec de l'envoi du document".
2. **Cause RLS masquée** — `uploadFile` log juste `console.error('Upload error', uploadError)` mais n'expose pas le message dans le toast. L'utilisateur ne voit jamais "row violates row-level security". Ajouter le message d'erreur Supabase dans le toast (description) pour faciliter le diagnostic futur.
3. **Aucun garde-fou `user.id`** — si la session expire pendant l'upload (token rafraîchi mais `user` momentanément null), `uploadFile` continue avec un path invalide. Vérifier `user?.id` avant chaque cycle d'upload et redemander auth si manquant.
4. **`fileExt` peut être undefined** quand le fichier n'a pas d'extension (ex: copie d'écran iOS) → `filePath` se termine par `.undefined`. Ajouter un fallback `'bin'`.

## Plan de correction (frontend uniquement)

### 1. `src/hooks/useCCCFormState.ts`
- Modifier `uploadFile(file, subPath)` :
  - Récupérer `user?.id` (déjà disponible via `useAuth`) — abandonner avec un toast clair si absent.
  - Construire `const filePath = \`${user.id}/${subPath}/${crypto.randomUUID()}.${ext || 'bin'}\``.
  - En cas d'`uploadError`, propager le message dans le toast appelant via une `Error` personnalisée OU ajouter le `uploadError.message` à la description du toast.
- Mettre à jour le toast titre : "Échec de l'envoi du document".

### 2. Vérifier les autres lecteurs
Les `signedUrl` créés ne changent pas (le path absolu est stocké dans `cadastral_contributions.owner_document_url`, etc.) ; les composants admin (`CCCDetailsDialog`, `OwnerSection`) lisent l'URL signée telle quelle → aucune migration de données nécessaire.

### 3. (optionnel) Documenter la convention
Ajouter un commentaire au-dessus de `uploadFile` expliquant la contrainte RLS pour éviter une future régression. Mémoire projet déjà présente (`file-storage-naming-standard-fr`) — la mettre à jour si besoin.

## Hors-périmètre (non corrigé)
- Pas de migration SQL : la RLS actuelle est correcte (sécurité PII).
- Pas de modification des autres formulaires (subdivision, mutation, expertise) — déjà conformes.
- Pas de changement du modèle de données.

## Vérification post-fix
1. Compléter le formulaire CCC, joindre un document propriétaire, soumettre → upload OK, contribution créée.
2. Vérifier dans Supabase Storage que le chemin commence par `<user.id>/owner-documents/...`.
3. Vérifier que l'admin peut toujours ouvrir le document via la signed URL stockée.

