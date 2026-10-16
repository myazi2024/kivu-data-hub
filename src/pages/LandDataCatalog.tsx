import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft } from 'lucide-react';
import Navigation from '@/components/ui/navigation';
import { Button } from '@/components/ui/button';
import AnalyticsCatalog from '@/components/analytics/catalog/AnalyticsCatalog';
import { useAnalyticsPaymentReturn } from '@/hooks/useAnalyticsPaymentReturn';

export default function LandDataCatalog() {
  useAnalyticsPaymentReturn();
  return (
    <div className="flex h-dvh flex-col bg-background">
      <Helmet><title>Catalogue des Données foncières | BIC</title><meta name="description" content="Choisissez les visuels Données foncières auxquels vous souhaitez accéder." /></Helmet>
      <Navigation />
      <main className="mx-auto flex min-h-0 w-full max-w-4xl flex-1 flex-col">
        <header className="flex shrink-0 items-center gap-2 border-b border-border p-3">
          <Button asChild variant="ghost" size="icon" className="h-11 w-11" aria-label="Retour aux Données foncières"><Link to="/map"><ArrowLeft className="h-4 w-4" /></Link></Button>
          <h1 className="text-base font-semibold">Catalogue des données</h1>
        </header>
        <AnalyticsCatalog />
      </main>
    </div>
  );
}
