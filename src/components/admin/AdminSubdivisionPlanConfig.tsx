import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import IdentitySection from './subdivision-plan-config/IdentitySection';
import WatermarksSection from './subdivision-plan-config/WatermarksSection';
import SignatureFramesEditor from './subdivision-plan-config/SignatureFramesEditor';
import LegendSymbolsEditor from './subdivision-plan-config/LegendSymbolsEditor';
import PaperFormatSection from './subdivision-plan-config/PaperFormatSection';
import ReportProgramSection from './subdivision-plan-config/ReportProgramSection';

export default function AdminSubdivisionPlanConfig() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Configuration du plan de lotissement</h2>
        <p className="text-sm text-muted-foreground">
          Personnalise l'apparence et le contenu des plans générés (en-tête, filigranes, cadres, légende, format, signalement).
        </p>
      </div>
      <Tabs defaultValue="identity">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="identity">Identité</TabsTrigger>
          <TabsTrigger value="watermarks">Filigranes</TabsTrigger>
          <TabsTrigger value="frames">Cadres signatures</TabsTrigger>
          <TabsTrigger value="legend">Légende</TabsTrigger>
          <TabsTrigger value="paper">Format & échelle</TabsTrigger>
          <TabsTrigger value="report">Signalement & pied</TabsTrigger>
        </TabsList>
        <TabsContent value="identity" className="mt-4"><IdentitySection /></TabsContent>
        <TabsContent value="watermarks" className="mt-4"><WatermarksSection /></TabsContent>
        <TabsContent value="frames" className="mt-4"><SignatureFramesEditor /></TabsContent>
        <TabsContent value="legend" className="mt-4"><LegendSymbolsEditor /></TabsContent>
        <TabsContent value="paper" className="mt-4"><PaperFormatSection /></TabsContent>
        <TabsContent value="report" className="mt-4"><ReportProgramSection /></TabsContent>
      </Tabs>
    </div>
  );
}
