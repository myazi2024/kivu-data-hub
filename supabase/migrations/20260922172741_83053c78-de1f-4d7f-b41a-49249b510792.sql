DO $mig$
DECLARE
  src text;
  fld text;
BEGIN
  SELECT pg_get_functiondef(oid) INTO src
  FROM pg_proc WHERE proname = 'sync_approved_contribution_to_parcel';

  -- 1. Convention unique SU/SR dans la branche UPDATE
  src := replace(src,
$old$        parcel_type = COALESCE(
          CASE
            WHEN NEW.province IS NOT NULL AND NEW.ville IS NOT NULL THEN 'urbain'
            WHEN NEW.province IS NOT NULL AND NEW.territoire IS NOT NULL THEN 'rural'
            ELSE parcel_type
          END, parcel_type),$old$,
$new$        parcel_type = COALESCE(
          NEW.parcel_type,
          CASE
            WHEN NEW.ville IS NOT NULL THEN 'SU'
            WHEN NEW.territoire IS NOT NULL THEN 'SR'
            ELSE parcel_type
          END, parcel_type),$new$);

  -- 2. Convention unique SU/SR dans la branche INSERT
  src := replace(src,
$old$        COALESCE(NEW.parcel_type, CASE WHEN NEW.ville IS NOT NULL THEN 'urbain'
                                       WHEN NEW.territoire IS NOT NULL THEN 'rural'
                                       ELSE 'urbain' END),$old$,
$new$        COALESCE(NEW.parcel_type, CASE WHEN NEW.ville IS NOT NULL THEN 'SU'
                                       WHEN NEW.territoire IS NOT NULL THEN 'SR'
                                       ELSE 'SU' END),$new$);

  -- 3. Champs récents recopiés dès la création de la parcelle
  src := replace(src,
$old$        appraised_value_usd, appraised_value_amount, appraised_value_currency, appraisal_report_url
      ) VALUES ($old$,
$new$        appraised_value_usd, appraised_value_amount, appraised_value_currency, appraisal_report_url,
        land_district, construction_status, previous_permit_number,
        actual_usage, actual_usage_other, operational_capacity, operational_capacity_unit, lease_contract_url
      ) VALUES ($new$);

  src := replace(src,
$old$        NEW.appraised_value_usd, NEW.appraised_value_amount, NEW.appraised_value_currency, NEW.appraisal_report_url
      )$old$,
$new$        NEW.appraised_value_usd, NEW.appraised_value_amount, NEW.appraised_value_currency, NEW.appraisal_report_url,
        NEW.land_district, NEW.construction_status, NEW.previous_permit_number,
        NEW.actual_usage, NEW.actual_usage_other, NEW.operational_capacity, NEW.operational_capacity_unit, NEW.lease_contract_url
      )$new$);

  -- 4. Champs effaçables lors d'une contribution de mise à jour
  FOREACH fld IN ARRAY ARRAY[
    'construction_year','construction_materials','standing',
    'monthly_rent_usd','rental_units','rental_units_count',
    'occupant_count','hosting_capacity','servitude_data',
    'sound_environment','nearby_noise_sources',
    'would_sell_if_offered','resale_price_usd','resale_price_amount','resale_price_currency',
    'has_recent_appraisal','appraisal_date','appraiser_name',
    'appraised_value_usd','appraised_value_amount','appraised_value_currency','appraisal_report_url'
  ] LOOP
    src := replace(src,
      format('        %1$s = COALESCE(NEW.%1$s, %1$s),', fld),
      format('        %1$s = NEW.%1$s,', fld));
  END LOOP;

  EXECUTE src;
END
$mig$;

UPDATE public.cadastral_parcels SET parcel_type = 'SU' WHERE parcel_type = 'urbain';
UPDATE public.cadastral_parcels SET parcel_type = 'SR' WHERE parcel_type = 'rural';
