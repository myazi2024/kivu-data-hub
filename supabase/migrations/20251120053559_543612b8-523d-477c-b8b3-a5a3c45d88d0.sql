
-- Migration de correction: Empêcher l'insertion de valeurs dans area_hectares (colonne générée)
-- Problème: Lors de l'approbation d'une contribution, une erreur se produit car le code essaie
-- d'insérer une valeur dans area_hectares qui est une colonne GENERATED (calculée automatiquement)

-- ============================================
-- 1. Recréer la colonne area_hectares en tant que colonne générée immutable
-- ============================================

-- Supprimer l'ancienne colonne si elle existe
ALTER TABLE public.cadastral_parcels 
DROP COLUMN IF EXISTS area_hectares CASCADE;

-- Recréer la colonne comme GENERATED ALWAYS (immutable)
ALTER TABLE public.cadastral_parcels 
ADD COLUMN area_hectares NUMERIC 
GENERATED ALWAYS AS (area_sqm / 10000.0) STORED;

-- ============================================
-- 2. Ajouter un commentaire explicatif
-- ============================================

COMMENT ON COLUMN public.cadastral_parcels.area_hectares IS 
'Colonne calculée automatiquement à partir de area_sqm. NE JAMAIS insérer ou mettre à jour directement cette colonne.';

-- ============================================
-- 3. Vérifier la colonne dans cadastral_contributions aussi
-- ============================================

-- S'assurer qu'il n'y a pas de colonne area_hectares dans cadastral_contributions
-- (elle ne devrait pas y être car c'est seulement pour les parcelles validées)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'cadastral_contributions' 
        AND column_name = 'area_hectares'
    ) THEN
        ALTER TABLE public.cadastral_contributions DROP COLUMN area_hectares CASCADE;
    END IF;
END $$;

-- ============================================
-- 4. Créer un trigger de validation (sécurité supplémentaire)
-- ============================================

-- Fonction pour empêcher toute tentative de modification de area_hectares
CREATE OR REPLACE FUNCTION public.prevent_area_hectares_modification()
RETURNS TRIGGER AS $$
BEGIN
  -- Cette fonction ne devrait jamais être appelée car area_hectares est GENERATED
  -- Mais si jamais quelqu'un essaie de forcer l'insertion, on bloque
  RAISE EXCEPTION 'Cannot manually set area_hectares - it is automatically calculated from area_sqm';
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Note: Pas besoin de trigger car GENERATED ALWAYS empêche déjà toute modification
-- Mais on garde la fonction au cas où

-- ============================================
-- 5. Index pour améliorer les performances
-- ============================================

-- Créer un index sur area_hectares pour les recherches par superficie
CREATE INDEX IF NOT EXISTS idx_cadastral_parcels_area_hectares 
ON public.cadastral_parcels(area_hectares);

-- ============================================
-- 6. Vérifier que tous les records existants sont corrects
-- ============================================

-- Mettre à jour les statistiques de la table
ANALYZE public.cadastral_parcels;
