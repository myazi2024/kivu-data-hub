
-- Table pour stocker les lots individuels approuvés (pour affichage carte)
CREATE TABLE public.subdivision_lots (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    subdivision_request_id UUID NOT NULL REFERENCES public.subdivision_requests(id) ON DELETE CASCADE,
    parcel_number VARCHAR(50) NOT NULL,
    lot_number VARCHAR(20) NOT NULL,
    lot_label VARCHAR(100),
    area_sqm NUMERIC NOT NULL DEFAULT 0,
    perimeter_m NUMERIC NOT NULL DEFAULT 0,
    intended_use VARCHAR(50) DEFAULT 'residential',
    owner_name VARCHAR(255),
    is_built BOOLEAN DEFAULT false,
    has_fence BOOLEAN DEFAULT false,
    fence_type VARCHAR(50),
    construction_type VARCHAR(50),
    notes TEXT,
    -- GPS coordinates of lot vertices (polygon)
    gps_coordinates JSONB,
    -- Relative coordinates for the plan view
    plan_coordinates JSONB,
    -- Color for map display
    color VARCHAR(20) DEFAULT '#22c55e',
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(subdivision_request_id, lot_number)
);

-- Table pour les voies internes du lotissement
CREATE TABLE public.subdivision_roads (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    subdivision_request_id UUID NOT NULL REFERENCES public.subdivision_requests(id) ON DELETE CASCADE,
    road_name VARCHAR(100),
    width_m NUMERIC DEFAULT 6,
    surface_type VARCHAR(50) DEFAULT 'earth',
    is_existing BOOLEAN DEFAULT false,
    -- Polyline coordinates
    gps_coordinates JSONB,
    plan_coordinates JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_subdivision_lots_request ON public.subdivision_lots(subdivision_request_id);
CREATE INDEX idx_subdivision_lots_parcel ON public.subdivision_lots(parcel_number);
CREATE INDEX idx_subdivision_roads_request ON public.subdivision_roads(subdivision_request_id);

-- Enable RLS
ALTER TABLE public.subdivision_lots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subdivision_roads ENABLE ROW LEVEL SECURITY;

-- RLS for subdivision_lots
CREATE POLICY "Users can view lots of their subdivision requests"
ON public.subdivision_lots
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.subdivision_requests sr
        WHERE sr.id = subdivision_request_id AND sr.user_id = auth.uid()
    )
);

CREATE POLICY "Admins can view all subdivision lots"
ON public.subdivision_lots
FOR SELECT
TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'super_admin'::app_role]));

CREATE POLICY "Admins can manage subdivision lots"
ON public.subdivision_lots
FOR ALL
TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'super_admin'::app_role]));

-- Public read for approved lots (for map display)
CREATE POLICY "Anyone can view approved subdivision lots"
ON public.subdivision_lots
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.subdivision_requests sr
        WHERE sr.id = subdivision_request_id AND sr.status = 'approved'
    )
);

-- RLS for subdivision_roads
CREATE POLICY "Users can view roads of their subdivision requests"
ON public.subdivision_roads
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.subdivision_requests sr
        WHERE sr.id = subdivision_request_id AND sr.user_id = auth.uid()
    )
);

CREATE POLICY "Admins can manage subdivision roads"
ON public.subdivision_roads
FOR ALL
TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'super_admin'::app_role]));

CREATE POLICY "Anyone can view roads of approved subdivisions"
ON public.subdivision_roads
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.subdivision_requests sr
        WHERE sr.id = subdivision_request_id AND sr.status = 'approved'
    )
);

-- Trigger for updated_at on subdivision_lots
CREATE TRIGGER update_subdivision_lots_updated_at
BEFORE UPDATE ON public.subdivision_lots
FOR EACH ROW
EXECUTE FUNCTION public.update_cadastral_services_updated_at();
