import { useState } from 'react';

export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export const useConfigValidation = () => {
  const [errors, setErrors] = useState<ValidationError[]>([]);

  const validateNumericRange = (
    value: number,
    field: string,
    min?: number,
    max?: number
  ): ValidationError[] => {
    const validationErrors: ValidationError[] = [];


    if (min !== undefined && value < min) {
      validationErrors.push({
        field,
        message: `${field} doit être supérieur ou égal à ${min}`,
        severity: 'error'
      });
    }

    if (max !== undefined && value > max) {
      validationErrors.push({
        field,
        message: `${field} doit être inférieur ou égal à ${max}`,
        severity: 'error'
      });
    }

    return validationErrors;
  };

  const validateMinMaxConsistency = (
    minValue: number,
    maxValue: number,
    fieldName: string
  ): ValidationError[] => {
    if (minValue > maxValue) {
      return [{
        field: fieldName,
        message: `La valeur minimale ne peut pas être supérieure à la valeur maximale`,
        severity: 'error'
      }];
    }
    return [];
  };

  const validateMapPreviewSettings = (settings: any): ValidationError[] => {
    const errors: ValidationError[] = [];

    // Valider zoom (1-19 pour Leaflet)
    errors.push(...validateNumericRange(settings.defaultZoom, 'Zoom par défaut', 1, 19));

    // Valider coordonnées latitude/longitude
    if (settings.defaultCenter) {
      errors.push(...validateNumericRange(settings.defaultCenter.lat, 'Latitude', -90, 90));
      errors.push(...validateNumericRange(settings.defaultCenter.lng, 'Longitude', -180, 180));
    } else {
      errors.push({
        field: 'defaultCenter',
        message: 'Le centre par défaut est requis',
        severity: 'error'
      });
    }

    // Valider markers (minimum et maximum)
    errors.push(...validateNumericRange(settings.minMarkers, 'Marqueurs minimum', 3, 100));
    errors.push(...validateNumericRange(settings.maxMarkers, 'Marqueurs maximum', 3, 100));
    errors.push(...validateMinMaxConsistency(
      settings.minMarkers,
      settings.maxMarkers,
      'Marqueurs'
    ));

    // Valider surface
    errors.push(...validateNumericRange(settings.minSurfaceSqm, 'Surface minimum', 0));
    errors.push(...validateNumericRange(settings.maxSurfaceSqm, 'Surface maximum', 0));
    if (settings.maxSurfaceSqm > 0) {
      errors.push(...validateMinMaxConsistency(
        settings.minSurfaceSqm,
        settings.maxSurfaceSqm,
        'Surface'
      ));
    }

    // Valider opacité (entre 0 et 1)
    if (settings.fillOpacity !== undefined) {
      if (settings.fillOpacity < 0 || settings.fillOpacity > 1) {
        errors.push({
          field: 'fillOpacity',
          message: 'L\'opacité doit être entre 0 et 1',
          severity: 'error'
        });
      }
    }

    // Valider lineWidth
    if (settings.lineWidth !== undefined) {
      errors.push(...validateNumericRange(settings.lineWidth, 'Épaisseur des lignes', 1, 10));
    }

    // Valider dimensionFontSize
    if (settings.dimensionFontSize !== undefined) {
      errors.push(...validateNumericRange(settings.dimensionFontSize, 'Taille de police', 8, 16));
    }

    // Valider dimensionFormat (doit contenir {value})
    if (settings.dimensionFormat && !settings.dimensionFormat.includes('{value}')) {
      errors.push({
        field: 'dimensionFormat',
        message: 'Le format des dimensions doit contenir {value}',
        severity: 'error'
      });
    }

    // Valider roadTypes (slugs uniques et labels non vides)
    if (settings.roadTypes && Array.isArray(settings.roadTypes)) {
      const values = settings.roadTypes.map((rt: any) => rt.value);
      const uniqueValues = new Set(values);
      if (values.length !== uniqueValues.size) {
        errors.push({
          field: 'roadTypes',
          message: 'Les valeurs des types de routes doivent être uniques',
          severity: 'error'
        });
      }

      settings.roadTypes.forEach((rt: any, index: number) => {
        if (!rt.value || rt.value.trim() === '') {
          errors.push({
            field: `roadTypes[${index}].value`,
            message: `La valeur du type de route ${index + 1} ne peut pas être vide`,
            severity: 'error'
          });
        }
        if (!rt.label || rt.label.trim() === '') {
          errors.push({
            field: `roadTypes[${index}].label`,
            message: `Le libellé du type de route ${index + 1} ne peut pas être vide`,
            severity: 'error'
          });
        }
      });
    }

    // Valider couleurs (format HEX valide)
    const colorFields = ['markerColor', 'lineColor', 'fillColor', 'dimensionTextColor'];
    colorFields.forEach(field => {
      if (settings[field]) {
        const colorValue = settings[field];
        // Vérifier que c'est un HEX valide et pas une variable CSS
        if (colorValue.includes('var(--') || colorValue.includes('hsl(')) {
          errors.push({
            field,
            message: `${field} doit être une couleur HEX valide (ex: #3b82f6)`,
            severity: 'error'
          });
        } else if (!/^#[0-9A-Fa-f]{6}$/.test(colorValue)) {
          errors.push({
            field,
            message: `${field} doit être au format HEX valide (ex: #3b82f6)`,
            severity: 'warning'
          });
        }
      }
    });

    return errors;
  };

  const validateValidationRules = (rules: any): ValidationError[] => {
    const errors: ValidationError[] = [];

    errors.push(...validateNumericRange(rules.min_area_sqm, 'Surface minimum', 0));
    errors.push(...validateNumericRange(rules.max_area_sqm, 'Surface maximum', 0));
    errors.push(...validateMinMaxConsistency(
      rules.min_area_sqm,
      rules.max_area_sqm,
      'Surface'
    ));

    errors.push(...validateNumericRange(rules.min_gps_points, 'Points GPS minimum', 3));

    return errors;
  };

  const validateCccCalculation = (calculation: any): ValidationError[] => {
    const errors: ValidationError[] = [];

    errors.push(...validateNumericRange(calculation.base_value_usd, 'Valeur de base', 0));
    errors.push(...validateNumericRange(calculation.per_sqm_rate, 'Taux par m²', 0));
    errors.push(...validateNumericRange(calculation.validity_days, 'Jours de validité', 1));

    return errors;
  };

  return {
    errors,
    setErrors,
    validateNumericRange,
    validateMinMaxConsistency,
    validateMapPreviewSettings,
    validateValidationRules,
    validateCccCalculation
  };
};
