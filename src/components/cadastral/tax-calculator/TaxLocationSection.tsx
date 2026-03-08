import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin } from 'lucide-react';
import { TaxCalculationInput } from '@/hooks/usePropertyTaxCalculator';
import { ZONE_OPTIONS, USAGE_OPTIONS } from './taxFormConstants';

interface TaxLocationSectionProps {
  input: TaxCalculationInput;
  /**
   * #4 fix: Accept setInput to allow editing zone & usage when not auto-detected.
   */
  setInput?: React.Dispatch<React.SetStateAction<TaxCalculationInput>>;
  parcelData?: any;
  /** Whether to show the superficie field (default: true) */
  showArea?: boolean;
  /** Whether zone was auto-detected from parcel number prefix */
  zoneAutoDetected?: boolean;
}

const TaxLocationSection: React.FC<TaxLocationSectionProps> = ({
  input, setInput, parcelData, showArea = true, zoneAutoDetected = false
}) => {
  const isEditable = !!setInput && !zoneAutoDetected;

  return (
    <Card className="rounded-2xl shadow-md border-border/50 overflow-hidden">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-blue-500/10 flex items-center justify-center">
            <MapPin className="h-3.5 w-3.5 text-blue-600" />
          </div>
          <Label className="text-sm font-semibold">Localisation & zone fiscale</Label>
          <Badge variant="outline" className="text-[10px] ml-auto">
            {zoneAutoDetected ? 'Données auto-remplies' : 'Modifiable'}
          </Badge>
        </div>

        {/* Province */}
        <AutoField label="Province" value={input.province || '—'} />

        {/* Type de zone — #4 fix: Editable when not auto-detected */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium flex items-center gap-1.5">
            Type de zone
            {zoneAutoDetected && (
              <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded-md font-normal">
                Auto (préfixe {input.zoneType === 'rural' ? 'SR' : 'SU'})
              </span>
            )}
          </Label>
          {isEditable ? (
            <div className="grid grid-cols-2 gap-2">
              {ZONE_OPTIONS.map(opt => {
                const Icon = opt.icon;
                const selected = input.zoneType === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setInput!(prev => ({ ...prev, zoneType: opt.value as 'urban' | 'rural' }))}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${
                      selected ? 'border-primary bg-primary/5 shadow-sm' : 'border-border hover:border-primary/30'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className={`h-4 w-4 ${selected ? 'text-primary' : 'text-muted-foreground'}`} />
                      <span className={`text-sm font-medium ${selected ? 'text-primary' : ''}`}>{opt.label}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{opt.desc}</p>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {ZONE_OPTIONS.map(opt => {
                const Icon = opt.icon;
                const selected = input.zoneType === opt.value;
                return (
                  <div
                    key={opt.value}
                    className={`p-3 rounded-xl border-2 text-left opacity-70 cursor-not-allowed ${
                      selected ? 'border-primary bg-primary/5 shadow-sm' : 'border-border'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className={`h-4 w-4 ${selected ? 'text-primary' : 'text-muted-foreground'}`} />
                      <span className={`text-sm font-medium ${selected ? 'text-primary' : ''}`}>{opt.label}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{opt.desc}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Ville — urban only */}
        {input.zoneType === 'urban' && (parcelData?.ville || input.ville) && (
          <div className="space-y-1.5">
            <AutoField label="Ville" value={parcelData?.ville || input.ville || '—'} />
            <p className="text-xs text-muted-foreground">
              {input.province === 'Kinshasa'
                ? '⚡ Kinshasa : taux majoré (×1.5)'
                : '📍 Taux standard'}
            </p>
          </div>
        )}

        {/* Conditional location fields */}
        {parcelData?.commune && <AutoField label="Commune" value={parcelData.commune} />}
        {parcelData?.quartier && <AutoField label="Quartier" value={parcelData.quartier} />}
        {parcelData?.avenue && <AutoField label="Avenue" value={parcelData.avenue} />}
        {parcelData?.territoire && <AutoField label="Territoire" value={parcelData.territoire} />}
        {parcelData?.collectivite && <AutoField label="Collectivité" value={parcelData.collectivite} />}
        {parcelData?.village && <AutoField label="Village" value={parcelData.village} />}

        {/* Usage déclaré — #4 fix: Editable when setInput is provided */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium flex items-center gap-1.5">
            Usage déclaré
            {!setInput && <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded-md font-normal">Auto</span>}
          </Label>
          {setInput ? (
            <Select
              value={input.usageType}
              onValueChange={(v) => setInput(prev => ({ ...prev, usageType: v as any }))}
            >
              <SelectTrigger className="h-10 text-sm rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl bg-popover">
                {USAGE_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label} — {opt.desc}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              value={
                USAGE_OPTIONS.find(o => o.value === input.usageType)
                  ? `${USAGE_OPTIONS.find(o => o.value === input.usageType)?.label} — ${USAGE_OPTIONS.find(o => o.value === input.usageType)?.desc}`
                  : input.usageType
              }
              disabled
              className="h-10 text-sm rounded-xl opacity-70"
            />
          )}
        </div>

        {/* Superficie */}
        {showArea && (
          <AutoField
            label="Superficie (m²)"
            value={
              (input.areaSqm || Number(parcelData?.area_sqm))
                ? `${(input.areaSqm || Number(parcelData?.area_sqm)).toLocaleString('fr-FR')} m²`
                : '—'
            }
          />
        )}
      </CardContent>
    </Card>
  );
};

/** Small reusable auto-filled field */
const AutoField: React.FC<{ label: string; value: string | number }> = ({ label, value }) => (
  <div className="space-y-1.5">
    <Label className="text-sm font-medium flex items-center gap-1.5">
      {label}
      <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded-md font-normal">Auto</span>
    </Label>
    <Input value={String(value)} disabled className="h-10 text-sm rounded-xl opacity-70" />
  </div>
);

export default TaxLocationSection;
