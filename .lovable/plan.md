

# Remplacement "Nos Services" par un carrousel de partenaires configurable

## Résumé

Remplacer `ServicesSection` sur la page d'accueil par un défilement horizontal automatique des logos/noms des partenaires BIC. Les partenaires seront gérés depuis l'admin via une nouvelle table Supabase.

## 1. Base de données

Créer une table `partners` :

```sql
CREATE TABLE public.partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  logo_url TEXT,
  website_url TEXT,
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;

-- Lecture publique (logos visibles par tous)
CREATE POLICY "Partners visible par tous" ON public.partners
  FOR SELECT USING (is_active = true);

-- CRUD admin uniquement
CREATE POLICY "Admin gère les partenaires" ON public.partners
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
```

Créer un bucket Storage `partners` (public) pour les logos.

## 2. Composant frontend — `PartnersSection.tsx`

Remplace `ServicesSection` dans `Index.tsx`. Affiche un défilement horizontal infini automatique (CSS animation `marquee` ou Embla carousel en mode autoplay). Chaque item = logo + nom du partenaire. Fallback texte si pas de logo. Lien cliquable vers `website_url` si renseigné.

## 3. Admin — `AdminPartners.tsx`

Interface CRUD pour gérer les partenaires :
- Liste avec drag-and-drop ou champ `display_order`
- Formulaire : nom, logo (upload vers Storage `partners`), URL site web, actif/inactif
- Prévisualisation du logo

## 4. Intégration Admin

- Ajouter un lazy import `AdminPartners` dans `Admin.tsx`
- Ajouter un case `'partners'` dans `renderContent()`
- Ajouter l'entrée dans `AdminSidebar.tsx` sous la catégorie "Contenu" (icône `Handshake` ou `Building2`)

## 5. Fichiers modifiés/créés

| Action | Fichier |
|--------|---------|
| Créer | `supabase/migrations/xxx_create_partners.sql` |
| Créer | `src/components/PartnersSection.tsx` |
| Créer | `src/components/admin/AdminPartners.tsx` |
| Modifier | `src/pages/Index.tsx` — remplacer `ServicesSection` par `PartnersSection` |
| Modifier | `src/pages/Admin.tsx` — ajouter lazy import + case |
| Modifier | `src/components/admin/AdminSidebar.tsx` — ajouter entrée "Partenaires" |

