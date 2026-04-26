## Problème

L'erreur « new row violates row-level security policy » survient parce que les politiques RLS de la table `partners` (et du bucket Storage `partners`) **n'autorisent que le rôle `admin`**, pas `super_admin`.

Vérification base de données :
- Table `partners` — politique `ALL` : `has_role(auth.uid(), 'admin')` uniquement
- Storage `partners` (INSERT/UPDATE/DELETE) : `has_role(auth.uid(), 'admin')` uniquement
- Le compte `myazi2024@gmail.com` a le rôle `super_admin` → bloqué

C'est un oubli classique : `super_admin` est censé bypasser tout (cf. `mem://admin/systeme-permissions-granulaires-fr`), mais ces politiques l'ont omis.

## Correction (migration SQL)

Mettre à jour les 4 politiques pour accepter `admin` **OU** `super_admin`.

### Table `public.partners`
```sql
DROP POLICY "Admin gère les partenaires" ON public.partners;

CREATE POLICY "Admins gèrent les partenaires"
ON public.partners
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'))
WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));
```

### Bucket Storage `partners`
```sql
DROP POLICY "Admin upload partner logos" ON storage.objects;
DROP POLICY "Admin update partner logos" ON storage.objects;
DROP POLICY "Admin delete partner logos" ON storage.objects;

CREATE POLICY "Admins upload partner logos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'partners'
  AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin')));

CREATE POLICY "Admins update partner logos"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'partners'
  AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin')));

CREATE POLICY "Admins delete partner logos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'partners'
  AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin')));
```

## Aucun changement code

`AdminPartners.tsx` est correct — pas de modification frontend nécessaire.

## Résultat attendu

- `super_admin` et `admin` peuvent créer / modifier / supprimer des partenaires et uploader des logos
- Les autres rôles restent bloqués
- La lecture publique (`is_active = true`) est inchangée