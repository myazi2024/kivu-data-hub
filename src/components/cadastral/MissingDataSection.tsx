import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, PlusCircle, Lock } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface MissingDataSectionProps {
  categoryName: string;
  missingFields: string[];
  parcelNumber: string;
  categoryTab: 'general' | 'location' | 'history' | 'obligations';
}

const MissingDataSection: React.FC<MissingDataSectionProps> = ({
  categoryName,
  missingFields,
  parcelNumber,
  categoryTab
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const handleContribute = () => {
    if (!user) {
      toast({
        title: "Connexion requise",
        description: "Vous devez vous connecter pour contribuer aux données cadastrales.",
        variant: "destructive",
      });
      navigate('/auth', { 
        state: { 
          redirectTo: '/myazi',
          parcelNumber,
          contributionTab: categoryTab
        }
      });
      return;
    }

    // Rediriger vers AboutCCC (formulaire de contribution) avec l'onglet prérempli
    navigate('/about-ccc', {
      state: {
        parcelNumber,
        contributionMode: 'missing_data',
        targetTab: categoryTab,
        missingFields
      }
    });
  };

  return (
    <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900">
      <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-500" />
      <AlertTitle className="text-amber-900 dark:text-amber-200 font-semibold mb-2">
        Données pas encore disponibles
      </AlertTitle>
      <AlertDescription className="space-y-3">
        <p className="text-sm text-amber-800 dark:text-amber-300">
          Les informations suivantes sont manquantes pour cette parcelle :
        </p>
        <ul className="text-xs text-amber-700 dark:text-amber-400 list-disc list-inside space-y-1 ml-2">
          {missingFields.slice(0, 5).map((field, index) => (
            <li key={index}>{field}</li>
          ))}
          {missingFields.length > 5 && (
            <li className="text-amber-600 dark:text-amber-500 italic">
              ... et {missingFields.length - 5} autre{missingFields.length - 5 > 1 ? 's' : ''} donnée{missingFields.length - 5 > 1 ? 's' : ''}
            </li>
          )}
        </ul>
        <Button
          onClick={handleContribute}
          size="sm"
          className="w-full mt-3 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white shadow-md"
        >
          {user ? (
            <>
              <PlusCircle className="h-4 w-4 mr-2" />
              Cliquez ici pour ajouter les données manquantes
            </>
          ) : (
            <>
              <Lock className="h-4 w-4 mr-2" />
              Se connecter pour contribuer
            </>
          )}
        </Button>
        {user && (
          <p className="text-xs text-amber-600 dark:text-amber-500 italic mt-2">
            💰 Vous gagnerez un Code CCC de 0,50 à 5 USD selon les données ajoutées
          </p>
        )}
      </AlertDescription>
    </Alert>
  );
};

export default MissingDataSection;
