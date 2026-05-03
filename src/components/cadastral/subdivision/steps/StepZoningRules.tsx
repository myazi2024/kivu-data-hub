import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, Ruler, Maximize2, Route, TreePine, LayoutGrid, MapPin, Info, FileText, AlertTriangle } from 'lucide-react';
import type { ZoningComplianceResult } from '../hooks/useZoningCompliance';

interface StepZoningRulesProps {
  compliance: ZoningComplianceResult;
}

interface NormItem {
  icon: React.ReactNode;
  title: string;
  value: string;
  severity: 'block' | 'warn';
  description: string;
}

const StepZoningRules: React.FC<StepZoningRulesProps> = ({ compliance }) => {
  const { rule, sectionType, matchedLocation } = compliance;
  if (!rule) return null;

  const items: NormItem[] = [];

  if (rule.min_lot_area_sqm > 0) {
    items.push({
      icon: <Maximize2 className="h-4 w-4" />,
      title: 'Surface minimale par lot',
      value: `${rule.min_lot_area_sqm} m²`,
      severity: 'block',
      description:
        "Aucun lot du découpage ne pourra être inférieur à cette surface. Tout lot dont l'aire est en deçà de ce seuil sera signalé comme erreur bloquante sur l'onglet « Conception » et empêchera la soumission de la demande.",
    });
  }

  if (rule.max_lot_area_sqm && rule.max_lot_area_sqm > 0) {
    items.push({
      icon: <Maximize2 className="h-4 w-4" />,
      title: 'Surface maximale par lot',
      value: `${rule.max_lot_area_sqm} m²`,
      severity: 'warn',
      description:
        "Plafond indicatif au-delà duquel un lot est jugé surdimensionné pour la zone. Un avertissement sera affiché ; la demande reste soumissible mais l'administration pourra exiger un redécoupage.",
    });
  }

  if (rule.min_road_width_m > 0) {
    items.push({
      icon: <Route className="h-4 w-4" />,
      title: 'Largeur minimale de voirie',
      value: `${rule.min_road_width_m} m${rule.recommended_road_width_m > rule.min_road_width_m ? ` (recommandée : ${rule.recommended_road_width_m} m)` : ''}`,
      severity: 'block',
      description:
        "Largeur minimale exigée pour toute voie tracée à l'intérieur du lotissement. Cette norme garantit l'accès des véhicules de secours, la circulation et le respect du gabarit routier en vigueur dans la zone.",
    });
  }

  if (rule.min_front_road_m > 0) {
    items.push({
      icon: <Ruler className="h-4 w-4" />,
      title: 'Façade minimale sur route',
      value: `${rule.min_front_road_m} m`,
      severity: 'warn',
      description:
        "Longueur minimale de façade que chaque lot doit présenter sur une voie carrossable. Elle conditionne l'accès direct au lot, sa constructibilité et sa valeur foncière.",
    });
  }

  if (rule.min_common_space_pct > 0) {
    items.push({
      icon: <TreePine className="h-4 w-4" />,
      title: 'Pourcentage minimal d\'espaces communs',
      value: `${rule.min_common_space_pct} %`,
      severity: 'block',
      description:
        "Part minimale de la parcelle-mère devant être réservée aux espaces communs (espaces verts, drainage, parkings, aires de jeux, marché). Ce ratio est calculé en direct sur l'onglet « Conception » à partir de la surface totale de la parcelle-mère.",
    });
  }

  if (rule.max_lots_per_request) {
    items.push({
      icon: <LayoutGrid className="h-4 w-4" />,
      title: 'Nombre maximal de lots',
      value: `${rule.max_lots_per_request} lots`,
      severity: 'block',
      description:
        "Plafond du nombre de lots autorisé par demande de lotissement dans cette zone. Au-delà, la conformité sera refusée et la demande ne pourra être soumise.",
    });
  }

  const sectionLabel = sectionType === 'urban' ? 'urbain' : 'rural';
  const locationLabel =
    matchedLocation && matchedLocation !== '*'
      ? matchedLocation
      : 'règle générale (par défaut)';

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-primary/5 border border-primary/20">
        <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h2 className="text-base sm:text-lg font-bold leading-tight">
            Normes cadastrales applicables à votre lotissement
          </h2>
          <div className="flex flex-wrap items-center gap-2 mt-1.5">
            <Badge variant="secondary" className="text-[10px] gap-1">
              <MapPin className="h-3 w-3" /> Zone : {locationLabel}
            </Badge>
            <Badge variant="outline" className="text-[10px] capitalize">
              Secteur {sectionLabel}
            </Badge>
          </div>
        </div>
      </div>

      {/* Intro professionnelle */}
      <Alert className="border-primary/30">
        <Info className="h-4 w-4" />
        <AlertTitle className="text-sm">Pourquoi ces normes ?</AlertTitle>
        <AlertDescription className="text-xs sm:text-sm leading-relaxed text-muted-foreground">
          Les services cadastraux ont défini, pour la zone d'implantation de votre parcelle, un
          ensemble de normes de zonage destinées à garantir la cohérence du plan cadastral, la
          viabilité des voiries, la salubrité des lots et la qualité des espaces communs. Avant de
          concevoir votre lotissement, prenez connaissance de ces normes : chaque découpage que vous
          proposerez sera automatiquement comparé à ces règles, et votre demande ne pourra être
          soumise pour traitement que si l'ensemble du plan les respecte intégralement.
        </AlertDescription>
      </Alert>

      {/* Liste détaillée */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          Normes en vigueur dans cette zone
        </h3>
        {items.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">
            Aucune norme chiffrée n'a été paramétrée pour cette zone — le contrôle de conformité
            se limitera aux invariants géométriques généraux.
          </p>
        ) : (
          items.map((item, i) => (
            <Card key={i} className="border-border/60">
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 min-w-0">
                    <span className="text-primary shrink-0">{item.icon}</span>
                    <span className="truncate">{item.title}</span>
                  </span>
                  <span className="flex items-center gap-2 shrink-0">
                    <Badge variant="default" className="text-xs font-mono">
                      {item.value}
                    </Badge>
                    <Badge
                      variant={item.severity === 'block' ? 'destructive' : 'secondary'}
                      className="text-[10px]"
                    >
                      {item.severity === 'block' ? 'Bloquant' : 'Avertissement'}
                    </Badge>
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="py-0 px-4 pb-3">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {item.description}
                </p>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Notes admin */}
      {rule.notes && rule.notes.trim() && (
        <Card className="border-amber-500/30 bg-amber-50/40 dark:bg-amber-950/10">
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm flex items-center gap-2">
              <Info className="h-4 w-4 text-amber-600" />
              Précisions complémentaires des services cadastraux
            </CardTitle>
          </CardHeader>
          <CardContent className="py-0 px-4 pb-3">
            <p className="text-xs whitespace-pre-line leading-relaxed">{rule.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Ce qui est vérifié */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Contrôles automatiques effectués sur votre plan
          </CardTitle>
        </CardHeader>
        <CardContent className="py-0 px-4 pb-3">
          <ul className="text-xs text-muted-foreground space-y-1.5 list-disc list-inside">
            <li>Surface de chaque lot (minimum / maximum réglementaire)</li>
            <li>Largeur réelle de chaque voie tracée</li>
            <li>Façade de chaque lot sur route carrossable</li>
            <li>Ratio d'espaces communs sur la surface totale de la parcelle-mère</li>
            <li>Nombre total de lots créés</li>
          </ul>
          <p className="text-[11px] text-muted-foreground mt-2 italic">
            Ces contrôles sont recalculés en direct à chaque modification du plan, et un panneau de
            conformité accessible depuis l'onglet « Conception » liste, en temps réel, les
            écarts détectés.
          </p>
        </CardContent>
      </Card>

      {/* Engagement */}
      <Alert variant="default" className="border-amber-500/40 bg-amber-50/40 dark:bg-amber-950/10">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <AlertTitle className="text-sm">Engagement de conformité</AlertTitle>
        <AlertDescription className="text-xs sm:text-sm leading-relaxed">
          En cliquant sur <strong>« Suivant »</strong>, vous attestez avoir pris connaissance de
          ces normes et vous engagez à concevoir un plan de lotissement qui les respecte
          intégralement. Le système refusera toute soumission tant qu'au moins une erreur de
          conformité subsistera ; les avertissements, eux, n'empêchent pas l'envoi mais pourront
          motiver une demande de correction par l'administration cadastrale.
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default StepZoningRules;
