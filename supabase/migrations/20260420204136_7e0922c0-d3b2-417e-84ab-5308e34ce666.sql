-- RPC unifiée pour upsert atomique cart + discounts (évite race condition)
CREATE OR REPLACE FUNCTION public.upsert_cadastral_cart_draft(
  _cart_data jsonb DEFAULT NULL,
  _discounts_data jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  INSERT INTO public.cadastral_cart_drafts (user_id, cart_data, discounts_data)
  VALUES (
    _user_id,
    COALESCE(_cart_data, '{}'::jsonb),
    COALESCE(_discounts_data, '{}'::jsonb)
  )
  ON CONFLICT (user_id) DO UPDATE
  SET
    cart_data = COALESCE(EXCLUDED.cart_data, public.cadastral_cart_drafts.cart_data),
    discounts_data = COALESCE(EXCLUDED.discounts_data, public.cadastral_cart_drafts.discounts_data),
    updated_at = now()
  WHERE
    -- Ne touche que les champs effectivement fournis par l'appelant
    (_cart_data IS NOT NULL OR _discounts_data IS NOT NULL);

  -- Cas où les deux sont NULL : no-op (pas d'écrasement)
  IF _cart_data IS NULL AND _discounts_data IS NULL THEN
    RETURN;
  END IF;

  -- Si seule une des colonnes est fournie, restaurer l'autre depuis l'existant
  IF _cart_data IS NULL THEN
    UPDATE public.cadastral_cart_drafts
    SET cart_data = cart_data  -- préserve
    WHERE user_id = _user_id;
  END IF;

  IF _discounts_data IS NULL THEN
    UPDATE public.cadastral_cart_drafts
    SET discounts_data = discounts_data  -- préserve
    WHERE user_id = _user_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_cadastral_cart_draft(jsonb, jsonb) TO authenticated;