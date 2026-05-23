import { lazy, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Grid3X3, DollarSign, Ruler, Layers, BarChart3, Loader2, ListTree, FileText, Compass, FileCog, History } from 'lucide-react';

const AdminSubdivisionRequests = lazy(() =>
  import('./AdminSubdivisionRequests').then(m => ({ default: m.AdminSubdivisionRequests }))
);
const AdminSubdivisionFeesConfig = lazy(() => import('./AdminSubdivisionFeesConfig'));
const AdminSubdivisionZoningRules = lazy(() => import('./AdminSubdivisionZoningRules'));
const AdminSubdivisionReferences = lazy(() => import('./AdminSubdivisionReferences'));
const AdminSubdivisionRequiredDocs = lazy(() => import('./AdminSubdivisionRequiredDocs'));
const AdminSubdivisionPlanElements = lazy(() => import('./AdminSubdivisionPlanElements'));
const AdminSubdivisionLots = lazy(() => import('./AdminSubdivisionLots'));
const AdminSubdivisionAnalytics = lazy(() => import('./AdminSubdivisionAnalytics'));
const AdminSubdivisionPlanConfig = lazy(() => import('./AdminSubdivisionPlanConfig'));
const AdminSubdivisionPlanVersions = lazy(() => import('./AdminSubdivisionPlanVersions'));

const Fallback = () => (
  <div className="flex items-center justify-center py-16 text-muted-foreground">
    <Loader2 className="h-6 w-6 animate-spin mr-2" /> Chargement…
  </div>
);

const VALID_SUBS = ['requests', 'fees', 'zoning', 'references', 'documents', 'plan-elements', 'plan-config', 'lots', 'analytics', 'versions'] as const;

export default function AdminSubdivisionHub() {
  const [params, setParams] = useSearchParams();
  const sub = params.get('sub');
  const active = (VALID_SUBS as readonly string[]).includes(sub ?? '') ? (sub as string) : 'requests';

  const handleChange = (next: string) => {
    const newParams = new URLSearchParams(params);
    newParams.set('tab', 'subdivision-hub');
    if (next === 'requests') newParams.delete('sub');
    else newParams.set('sub', next);
    setParams(newParams, { replace: true });
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Grid3X3 className="h-6 w-6 text-primary" />
          Lotissement
        </h1>
        <p className="text-sm text-muted-foreground">
          Gestion centralisée des demandes, frais, règles, lots et analytics.
        </p>
      </div>

      <Tabs value={active} onValueChange={handleChange} className="w-full">
        <Card className="p-2">
          <TabsList className="flex sm:grid sm:grid-cols-5 lg:grid-cols-10 w-full overflow-x-auto sm:overflow-visible gap-1 sm:gap-0 h-auto justify-start sm:justify-stretch">
            <TabsTrigger value="requests" className="gap-1.5 shrink-0 sm:shrink">
              <Grid3X3 className="h-4 w-4" /> <span>Demandes</span>
            </TabsTrigger>
            <TabsTrigger value="fees" className="gap-1.5 shrink-0 sm:shrink">
              <DollarSign className="h-4 w-4" /> <span>Frais</span>
            </TabsTrigger>
            <TabsTrigger value="zoning" className="gap-1.5 shrink-0 sm:shrink">
              <Ruler className="h-4 w-4" /> <span>Zonage</span>
            </TabsTrigger>
            <TabsTrigger value="references" className="gap-1.5 shrink-0 sm:shrink">
              <ListTree className="h-4 w-4" /> <span>Référentiels</span>
            </TabsTrigger>
            <TabsTrigger value="documents" className="gap-1.5 shrink-0 sm:shrink">
              <FileText className="h-4 w-4" /> <span>Documents</span>
            </TabsTrigger>
            <TabsTrigger value="plan-elements" className="gap-1.5 shrink-0 sm:shrink">
              <Compass className="h-4 w-4" /> <span>Plan</span>
            </TabsTrigger>
            <TabsTrigger value="plan-config" className="gap-1.5 shrink-0 sm:shrink">
              <FileCog className="h-4 w-4" /> <span>Config plan</span>
            </TabsTrigger>
            <TabsTrigger value="versions" className="gap-1.5 shrink-0 sm:shrink">
              <History className="h-4 w-4" /> <span>Versions</span>
            </TabsTrigger>
            <TabsTrigger value="lots" className="gap-1.5 shrink-0 sm:shrink">
              <Layers className="h-4 w-4" /> <span>Lots &amp; voies</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-1.5 shrink-0 sm:shrink">
              <BarChart3 className="h-4 w-4" /> <span>Analytics</span>
            </TabsTrigger>
          </TabsList>
        </Card>


        <TabsContent value="requests" className="mt-4">
          <Suspense fallback={<Fallback />}><AdminSubdivisionRequests /></Suspense>
        </TabsContent>
        <TabsContent value="fees" className="mt-4">
          <Suspense fallback={<Fallback />}><AdminSubdivisionFeesConfig /></Suspense>
        </TabsContent>
        <TabsContent value="zoning" className="mt-4">
          <Suspense fallback={<Fallback />}><AdminSubdivisionZoningRules /></Suspense>
        </TabsContent>
        <TabsContent value="references" className="mt-4">
          <Suspense fallback={<Fallback />}><AdminSubdivisionReferences /></Suspense>
        </TabsContent>
        <TabsContent value="documents" className="mt-4">
          <Suspense fallback={<Fallback />}><AdminSubdivisionRequiredDocs /></Suspense>
        </TabsContent>
        <TabsContent value="plan-elements" className="mt-4">
          <Suspense fallback={<Fallback />}><AdminSubdivisionPlanElements /></Suspense>
        </TabsContent>
        <TabsContent value="versions" className="mt-4">
          <Suspense fallback={<Fallback />}><AdminSubdivisionPlanVersions /></Suspense>
        </TabsContent>
        <TabsContent value="plan-config" className="mt-4">
          <Suspense fallback={<Fallback />}><AdminSubdivisionPlanConfig /></Suspense>
        </TabsContent>
        <TabsContent value="lots" className="mt-4">
          <Suspense fallback={<Fallback />}><AdminSubdivisionLots /></Suspense>
        </TabsContent>
        <TabsContent value="analytics" className="mt-4">
          <Suspense fallback={<Fallback />}><AdminSubdivisionAnalytics /></Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}
