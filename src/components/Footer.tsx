import { useLocation } from 'react-router-dom';
import { Cookie } from 'lucide-react';
import { useAppAppearance } from '@/hooks/useAppAppearance';
import { useCookies } from '@/hooks/useCookies';
import HomeBicIndicators from '@/components/home/HomeBicIndicators';

const Footer = () => {
  const location = useLocation();
  const isHomePage = location.pathname === '/';
  const { config } = useAppAppearance();
  const { reopenBanner } = useCookies();
  const appName = config.app_name || 'BIC';
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-foreground text-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        {isHomePage && (
          <div className="mb-2 flex justify-center w-full">
            <HomeBicIndicators configured={config} />
          </div>
        )}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
          <div className="text-muted-foreground text-center sm:text-left">
            <span>© {currentYear} {appName} - Tous droits réservés</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={reopenBanner}
              className="flex items-center gap-1 bg-background/10 px-2 py-1 rounded hover:bg-background/20 transition-colors cursor-pointer"
            >
              <Cookie className="h-3 w-3 text-primary" />
              <span className="text-background text-xs font-medium">Gérer les cookies</span>
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
