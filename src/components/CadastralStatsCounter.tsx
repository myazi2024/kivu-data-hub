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
      <div className="w-full max-w-4xl mx-auto mt-6 px-4">
        <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-xl">
          <div className="p-4 sm:p-6">
            <Skeleton className="h-6 w-48 mb-4 mx-auto" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-20" />
              ))}
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto mt-6 px-4">
      <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
        <div className="p-4 sm:p-6">
          {/* En-tête avec total */}
          <div className="flex items-center justify-center gap-2 mb-4">
            <TrendingUp className="h-5 w-5 text-seloger-red" />
            <h3 className="text-lg sm:text-xl font-bold text-seloger-dark">
              <span className="text-seloger-red">{totalQueries.toLocaleString()}</span> requêtes cadastrales effectuées
            </h3>
          </div>

          {/* Grille des services */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {stats.map((stat) => {
              const IconComponent = getServiceIcon(stat.serviceId);
              const shortName = getServiceShortName(stat.serviceName);
              
              return (
                <div
                  key={stat.serviceId}
                  className="group relative bg-gradient-to-br from-seloger-red/5 via-white to-seloger-red-light/5 rounded-xl p-3 sm:p-4 border border-seloger-red/10 hover:border-seloger-red/30 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5"
                >
                  {/* Icône et nombre */}
                  <div className="flex flex-col items-center text-center space-y-2">
                    <div className="relative">
                      <div className="absolute -inset-1 bg-gradient-to-r from-seloger-red/20 to-seloger-red-light/20 rounded-lg blur opacity-0 group-hover:opacity-100 transition-all duration-300" />
                      <div className="relative bg-white rounded-lg p-2 border border-seloger-red/20">
                        <IconComponent className="h-4 w-4 sm:h-5 sm:w-5 text-seloger-red" />
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <div className="text-xl sm:text-2xl font-bold text-seloger-red">
                        {stat.count.toLocaleString()}
                      </div>
                      <div className="text-xs sm:text-sm text-seloger-dark/70 font-medium leading-tight">
                        {shortName}
                      </div>
                    </div>
                  </div>

                  {/* Effet de brillance au hover */}
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out opacity-0 group-hover:opacity-100" />
                </div>
              );
            })}
          </div>

          {/* Note discrète */}
          <div className="mt-4 text-center">
            <p className="text-xs text-seloger-dark/50">
              Statistiques mises à jour en temps réel
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default CadastralStatsCounter;