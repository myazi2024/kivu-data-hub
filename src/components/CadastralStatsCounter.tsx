import React from 'react';
import { Card } from '@/components/ui/card';
import { BarChart3, Users, FileText, Map, Building, TrendingUp } from 'lucide-react';
import { useCadastralStats } from '@/hooks/useCadastralStats';
import { Skeleton } from '@/components/ui/skeleton';

const CadastralStatsCounter = () => {
  const { stats, totalQueries, loading } = useCadastralStats();

  const getServiceIcon = (serviceId: string) => {
    switch (serviceId) {
      case 'information':
        return FileText;
      case 'location_history':
        return Map;
      case 'history':
        return Users;
      case 'obligations':
        return Building;
      default:
        return BarChart3;
    }
  };

  const getServiceShortName = (serviceName: string) => {
    switch (serviceName) {
      case 'Informations générales':
        return 'Infos générales';
      case 'Localisation et Historique de bornage':
        return 'Localisation';
      case 'Historique complet des propriétaires':
        return 'Historique';
      case 'Obligations fiscales et hypothécaires':
        return 'Obligations';
      default:
        return serviceName;
    }
  };

  if (loading) {
    return (
      <div className="w-full max-w-4xl mx-auto mt-4 px-4">
        <div className="w-full bg-white/90 backdrop-blur-sm rounded-lg border border-white/20 shadow-sm">
          <div className="px-4 py-3 w-full">
            <Skeleton className="h-4 w-full max-w-80 mx-auto" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto mt-4 px-4">
      <div className="w-full bg-white/90 backdrop-blur-sm rounded-lg border border-white/20 shadow-sm">
        <div className="px-4 py-3 w-full">
          {/* Ligne horizontale avec total et détails */}
          <div className="flex items-center justify-between gap-4 text-sm w-full">
            {/* Total */}
            <div className="flex items-center gap-2 shrink-0">
              <TrendingUp className="h-4 w-4 text-seloger-red" />
              <span className="text-seloger-dark/70">Total:</span>
              <span className="font-semibold text-seloger-red">{totalQueries.toLocaleString()}</span>
            </div>
            
            {/* Séparateur */}
            <div className="w-px h-4 bg-seloger-dark/20 hidden sm:block"></div>
            
            {/* Services en ligne */}
            <div className="flex items-center gap-2 sm:gap-4 flex-1 justify-end">
              {stats.map((stat, index) => {
                const IconComponent = getServiceIcon(stat.serviceId);
                const shortName = getServiceShortName(stat.serviceName);
                
                return (
                  <div key={stat.serviceId} className="flex items-center gap-1">
                    <IconComponent className="h-3 w-3 text-seloger-red/70" />
                    <span className="text-seloger-dark/60 text-xs hidden lg:inline">{shortName}:</span>
                    <span className="font-medium text-seloger-red text-xs">{stat.count}</span>
                    {index < stats.length - 1 && <span className="text-seloger-dark/30 mx-1 hidden sm:inline">•</span>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CadastralStatsCounter;