import { describe, it, expect } from 'vitest';
import {
  CCC_EDITABLE_FIELDS, getEditableField, isEditableField, toInputValue,
  formatFieldValue, validateFieldValue, collectInvalidatedFields,
} from '@/lib/ccc/editableFieldsCatalog';

describe('editableFieldsCatalog', () => {
  it('expose des libellés uniques par champ', () => {
    const fields = CCC_EDITABLE_FIELDS.map((f) => f.field);
    expect(new Set(fields).size).toBe(fields.length);
  });

  it('exclut les champs sensibles', () => {
    expect(isEditableField('parcel_number')).toBe(false);
    expect(isEditableField('status')).toBe(false);
    expect(isEditableField('fraud_score')).toBe(false);
    expect(isEditableField('construction_materials')).toBe(true);
  });

  it('convertit les valeurs en texte de saisie', () => {
    expect(toInputValue(null)).toBe('');
    expect(toInputValue(true)).toBe('true');
    expect(toInputValue(12)).toBe('12');
    expect(toInputValue('2024-01-05T10:00:00Z')).toContain('2024-01-05');
  });

  it('formate les booléens et les unités', () => {
    const rented = getEditableField('is_rented')!;
    expect(formatFieldValue(rented, 'true')).toBe('Oui');
    const height = getEditableField('building_height')!;
    expect(formatFieldValue(height, '9')).toContain('9');
    expect(formatFieldValue(height, '')).toBe('Non renseigné');
  });

  it('valide les bornes numériques', () => {
    const floors = getEditableField('floor_number')!;
    expect(validateFieldValue(floors, '-1')).toBeTruthy();
    expect(validateFieldValue(floors, '2')).toBeNull();
    expect(validateFieldValue(floors, 'abc')).toBeTruthy();
  });

  it('invalide les données dépendantes renseignées', () => {
    const contribution = {
      construction_nature: 'Durable',
      construction_materials: 'Béton armé',
      standing: 'Haut standing',
    };
    const invalidated = collectInvalidatedFields('construction_type', contribution);
    expect(invalidated).toContain('construction_nature');
    expect(collectInvalidatedFields('construction_type', {})).toEqual([]);
  });
});
