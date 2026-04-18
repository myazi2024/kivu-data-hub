import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Download, RefreshCw, FlaskConical } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface Props {
  excludeTest: boolean;
  onToggleExcludeTest: (v: boolean) => void;
  onRefresh: () => void;
  refreshing: boolean;
  onExportCSV: () => void;
  onExportJSON: () => void;
}

export function DashboardHeader({
  excludeTest,
  onToggleExcludeTest,
  onRefresh,
  refreshing,
  onExportCSV,
  onExportJSON,
}: Props) {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
      <div>
        <h2 className="text-xl md:text-2xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-xs md:text-sm text-muted-foreground">Vue d'ensemble de la plateforme</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2 px-2 py-1.5 rounded-md border bg-muted/30">
                <FlaskConical className="h-3.5 w-3.5 text-muted-foreground" />
                <Label htmlFor="exclude-test" className="text-xs cursor-pointer">
                  Exclure tests
                </Label>
                <Switch
                  id="exclude-test"
                  checked={excludeTest}
                  onCheckedChange={onToggleExcludeTest}
                />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">Filtre les enregistrements préfixés <code>TEST-</code></p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <Button variant="outline" size="sm" onClick={onRefresh} disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
          Actualiser
        </Button>
        <Button variant="outline" size="sm" onClick={onExportCSV}>
          <Download className="h-4 w-4 mr-1" />CSV
        </Button>
        <Button variant="outline" size="sm" onClick={onExportJSON}>
          <Download className="h-4 w-4 mr-1" />JSON
        </Button>
      </div>
    </div>
  );
}
