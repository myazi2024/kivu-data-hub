/**
 * Shared taxpayer state across the four sub-flows of TaxManagementDialog
 * (Foncier / Bâtisse / Locatif / Ajouter un paiement).
 *
 * Goals:
 * - Avoid asking for NIF / owner name / ID document multiple times.
 * - Pre-fill from `parcelData.current_owner_name` when available.
 * - Keep state alive while the dialog is open; reset on close.
 */
import { useState, useCallback } from 'react';

export interface SharedTaxpayer {
  ownerName: string;
  setOwnerName: (v: string) => void;
  hasNif: boolean | null;
  setHasNif: (v: boolean | null) => void;
  nif: string;
  setNif: (v: string) => void;
  idDocumentFile: File | null;
  setIdDocumentFile: (f: File | null) => void;
  reset: () => void;
}

export function useSharedTaxpayer(initialOwnerName?: string | null): SharedTaxpayer {
  const [ownerName, setOwnerName] = useState<string>(initialOwnerName || '');
  const [hasNif, setHasNif] = useState<boolean | null>(null);
  const [nif, setNif] = useState<string>('');
  const [idDocumentFile, setIdDocumentFile] = useState<File | null>(null);

  const reset = useCallback(() => {
    setOwnerName(initialOwnerName || '');
    setHasNif(null);
    setNif('');
    setIdDocumentFile(null);
  }, [initialOwnerName]);

  return {
    ownerName, setOwnerName,
    hasNif, setHasNif,
    nif, setNif,
    idDocumentFile, setIdDocumentFile,
    reset,
  };
}
