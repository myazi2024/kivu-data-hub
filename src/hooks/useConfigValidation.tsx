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

    if (value < 0) {
      validationErrors.push({
        field,
        message: `${field} ne peut pas être négatif`,
        severity: 'error'
      });
    }

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

    // Valider zoom
    errors.push(...validateNumericRange(settings.defaultZoom, 'Zoom par défaut', 1, 19));

    // Valider coordonnées (bounds géographiques)
    if (!settings.defaultCenter || typeof settings.defaultCenter.lat !== 'number' || typeof settings.defaultCenter.lng !== 'number') {
      errors.push({
        field: 'defaultCenter',
        message: 'Le centre par défaut doit contenir une latitude et longitude valides',
        severity: 'error'
      });
    } else {
      errors.push(...validateNumericRange(settings.defaultCenter.lat, 'Latitude', -90, 90));
      errors.push(...validateNumericRange(settings.defaultCenter.lng, 'Longitude', -180, 180));
    }

    // Valider markers
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

    // Valider opacité
    if (settings.fillOpacity < 0 || settings.fillOpacity > 1) {
      errors.push({
        field: 'fillOpacity',
        message: 'L\'opacité doit être entre 0 et 1',
        severity: 'error'
      });
    }

    // Valider lineWidth
    errors.push(...validateNumericRange(settings.lineWidth, 'Épaisseur des lignes', 1, 10));

    // Valider dimensionFontSize
    errors.push(...validateNumericRange(settings.dimensionFontSize, 'Taille de police', 8, 16));

    // Valider dimensionFormat (doit contenir {value})
    if (settings.dimensionFormat && !settings.dimensionFormat.includes('{value}')) {
      errors.push({
        field: 'dimensionFormat',
        message: 'Le format de dimension doit contenir {value}',
        severity: 'error'
      });
    }

    // Valider couleurs (doivent être au format hex)
    const validateColor = (color: string, field: string) => {
      if (color && !color.match(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/)) {
        errors.push({
          field,
          message: `${field} doit être une couleur hexadécimale valide (ex: #3b82f6)`,
          severity: 'error'
        });
      }
    };

    validateColor(settings.markerColor, 'Couleur des marqueurs');
    validateColor(settings.lineColor, 'Couleur des lignes');
    validateColor(settings.fillColor, 'Couleur de remplissage');
    validateColor(settings.dimensionTextColor, 'Couleur du texte');

    // Valider roadTypes
    if (settings.roadTypes && Array.isArray(settings.roadTypes)) {
      const values = new Set<string>();
      settings.roadTypes.forEach((roadType: any, index: number) => {
        if (!roadType.value || !roadType.label) {
          errors.push({
            field: `roadTypes[${index}]`,
            message: `Le type de route ${index + 1} doit avoir une valeur et un libellé`,
            severity: 'error'
          });
        }
        if (roadType.value && values.has(roadType.value)) {
          errors.push({
            field: `roadTypes[${index}]`,
            message: `La valeur "${roadType.value}" est dupliquée`,
            severity: 'error'
          });
        }
        values.add(roadType.value);
      });
    }

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
