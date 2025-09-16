-- Créer une version modifiée de la fonction de validation qui fonctionne pour les codes de test
CREATE OR REPLACE FUNCTION public.validate_and_apply_discount_code(code_input text, invoice_amount numeric)
RETURNS TABLE(is_valid boolean, discount_amount numeric, reseller_id uuid, code_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  discount_rec RECORD;
  calculated_discount DECIMAL := 0;
BEGIN
  -- Chercher le code de remise (version modifiée pour les tests)
  SELECT dc.id, dc.discount_percentage, dc.discount_amount_usd, dc.reseller_id, dc.is_active, dc.expires_at, dc.max_usage, dc.usage_count
  INTO discount_rec
  FROM public.discount_codes dc
  WHERE dc.code = code_input
    AND dc.is_active = true
    AND (dc.expires_at IS NULL OR dc.expires_at > now())
    AND (dc.max_usage IS NULL OR dc.usage_count < dc.max_usage);

  -- Si le code n'est pas trouvé ou invalide
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 0::DECIMAL, NULL::UUID, NULL::UUID;
    RETURN;
  END IF;

  -- Calculer la remise
  IF discount_rec.discount_percentage > 0 THEN
    calculated_discount := (invoice_amount * discount_rec.discount_percentage / 100);
  ELSIF discount_rec.discount_amount_usd > 0 THEN
    calculated_discount := discount_rec.discount_amount_usd;
  END IF;

  -- S'assurer que la remise ne dépasse pas le montant de la facture
  calculated_discount := LEAST(calculated_discount, invoice_amount);

  RETURN QUERY SELECT true, calculated_discount, discount_rec.reseller_id, discount_rec.id;
END;
$$;