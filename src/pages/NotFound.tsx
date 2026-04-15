import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Helmet } from "react-helmet";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft } from "lucide-react";
import { useAppAppearance } from "@/hooks/useAppAppearance";

const NotFound = () => {
  const location = useLocation();
  const { config } = useAppAppearance();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <>
      <Helmet>
        <title>Page introuvable | BIC</title>
        <meta name="description" content="La page demandée n'existe pas ou a été déplacée." />
      </Helmet>
      <div className="min-h-dvh flex items-center justify-center bg-background px-4">
      <div className="text-center max-w-md">
        {config.logo_url && (
          <img
            src={String(config.logo_url)}
            alt={String(config.app_name || 'Logo')}
            className="h-12 w-12 object-contain mx-auto mb-4"
          />
        )}
        <h1 className="text-7xl font-extrabold text-primary mb-4">404</h1>
        <p className="text-xl font-semibold text-foreground mb-2">
          Page introuvable
        </p>
        <p className="text-muted-foreground mb-8">
          La page que vous recherchez n'existe pas ou a été déplacée.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild>
            <Link to="/" className="inline-flex items-center gap-2">
              <Home className="h-4 w-4" />
              Retour à l'accueil
            </Link>
          </Button>
          <Button variant="outline" onClick={() => window.history.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Page précédente
          </Button>
        </div>
      </div>
      </div>
    </>
  );
};

export default NotFound;
