import { lazy, Suspense } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Grid3X3, DollarSign, Ruler, Layers, BarChart3, Loader2 } from 'lucide-react';

// Lazy-load tab contents — keeps the hub light and avoids upfront cost
// when an admin only wants one tab.
const AdminSubdivisionRequests = lazy(() =>
  import('./AdminSubdivisionRequests').then(m => ({ default: m.AdminSubdivisionRequests }))
);
const AdminSubdivisionFeesConfig = lazy(() => import('./AdminSubdivisionFeesConfig'));
const AdminSubdivisionZoningRules = lazy(() => import('./AdminSubdivisionZoningRules'));
const AdminSubdivisionLots = lazy(() => import('./AdminSubdivisionLots'));
const AdminSubdivisionAnalytics = lazy(() => import('./AdminSubdivisionAnalytics'));

const Fallback = () => (
  <div className="flex items-center justify-center py-16 text-muted-foreground">
    <Loader2 className="h-6 w-6 animate-spin mr-2" /> Chargement…
  </div>
);

export default function AdminSubdivisionHub() {
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

      <Tabs defaultValue="requests" className="w-full">
        <Card className="p-2">
          <TabsList className="grid grid-cols-2 sm:grid-cols-5 w-full">
            <TabsTrigger value="requests" className="gap-1.5">
              <Grid3X3 className="h-4 w-4" /> <span className="hidden sm:inline">Demandes</span>
            </TabsTrigger>
            <TabsTrigger value="fees" className="gap-1.5">
              <DollarSign className="h-4 w-4" /> <span className="hidden sm:inline">Frais</span>
            </TabsTrigger>
            <TabsTrigger value="zoning" className="gap-1.5">
              <Ruler className="h-4 w-4" /> <span className="hidden sm:inline">Zonage</span>
            </TabsTrigger>
            <TabsTrigger value="lots" className="gap-1.5">
              <Layers className="h-4 w-4" /> <span className="hidden sm:inline">Lots & voies</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-1.5">
              <BarChart3 className="h-4 w-4" /> <span className="hidden sm:inline">Analytics</span>
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
