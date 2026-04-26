// LotsBulkActions — P2 actions on the full lot list:
//  - Renumber all lots 1..N (top-to-bottom-left-to-right via centroid)
//  - Export the lot table as CSV (number, usage, area, perimeter, vertex count, owner)
//
// Lives next to StepLotDesigner. Pure presentational — receives lots + setLots.

import React from 'react';
import { Button } from '@/components/ui/button';
import { Hash, Download } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { SubdivisionLot, USAGE_LABELS } from '../types';
import { polygonCentroid } from '../utils/geometry';

interface LotsBulkActionsProps {
  lots: SubdivisionLot[];
  setLots: (lots: SubdivisionLot[]) => void;
}

function csvEscape(value: unknown): string {
  const s = value == null ? '' : String(value);
  if (/[",;\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function downloadCsv(filename: string, csv: string) {
  // Excel-friendly UTF-8 BOM so accented chars render correctly.
  const blob = new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export const LotsBulkActions: React.FC<LotsBulkActionsProps> = ({ lots, setLots }) => {
  const handleRenumber = () => {
    if (lots.length === 0) return;
    // Order lots by centroid: top-to-bottom (y ascending) then left-to-right (x).
    const ordered = [...lots]
      .map((lot) => ({ lot, c: polygonCentroid(lot.vertices) }))
      .sort((a, b) => a.c.y - b.c.y || a.c.x - b.c.x)
      .map((entry, idx) => ({ ...entry.lot, lotNumber: String(idx + 1) }));
    // Preserve any lot not in the ordered set (shouldn't happen, defensive).
    const idMap = new Map(ordered.map((l) => [l.id, l]));
    setLots(lots.map((l) => idMap.get(l.id) ?? l));
  };

  const handleExportCsv = () => {
    const header = [
      'Numéro',
      'Usage',
      'Surface (m²)',
      'Périmètre (m)',
      'Sommets',
      'Propriétaire',
      'Bâti',
      'Clôturé',
      'Notes',
    ];
    const rows = lots.map((l) => [
      l.lotNumber,
      USAGE_LABELS[l.intendedUse] ?? l.intendedUse,
      l.areaSqm,
      l.perimeterM,
      l.vertices.length,
      l.ownerName ?? '',
      l.isBuilt ? 'oui' : 'non',
      l.hasFence ? 'oui' : 'non',
      l.notes ?? '',
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map(csvEscape).join(';'))
      .join('\n');
    const ts = new Date().toISOString().slice(0, 10);
    downloadCsv(`lotissement-lots-${ts}.csv`, csv);
  };

  return (
    <TooltipProvider>
      <div className="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={handleRenumber}
              disabled={lots.length === 0}
              className="h-6 px-2 text-[10px]"
              aria-label="Renuméroter tous les lots dans l'ordre"
            >
              <Hash className="h-3 w-3 mr-1" />
              Renuméroter
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            Renumérote tous les lots de 1 à {lots.length || 'N'} selon leur position (haut→bas, gauche→droite).
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={handleExportCsv}
              disabled={lots.length === 0}
              className="h-6 px-2 text-[10px]"
              aria-label="Exporter le tableau des lots en CSV"
            >
              <Download className="h-3 w-3 mr-1" />
              CSV
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            Télécharger le tableau des lots (numéro, usage, surface, périmètre…)
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
};

export default LotsBulkActions;
