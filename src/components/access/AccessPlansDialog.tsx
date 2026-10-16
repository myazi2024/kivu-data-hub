import { ReactNode, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Handshake, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import AnalyticsCatalogDialog from '@/components/analytics/catalog/AnalyticsCatalogDialog';

interface AccessPlansDialogProps {
  trigger: ReactNode;
}

/**
 * Choix de la formule d'accès aux Données foncières :
 * - « Paiement à l'usage » ouvre le catalogue des visuels de base.
 * - « Devenir Partenaire » renvoie vers la page Partenariat.
 */
export default function AccessPlansDialog({ trigger }: AccessPlansDialogProps) {
  const navigate = useNavigate();
  const [plansOpen, setPlansOpen] = useState(false);
  const [catalogOpen, setCatalogOpen] = useState(false);

  const goPartnership = () => {
    setPlansOpen(false);
    navigate('/partnership');
  };

  return (
    <>
      <Dialog open={plansOpen} onOpenChange={setPlansOpen}>
        <DialogTrigger asChild>{trigger}</DialogTrigger>
        <DialogContent
          className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl"
          onPointerDownOutside={e => e.preventDefault()}
          onInteractOutside={e => e.preventDefault()}
        >
          <DialogHeader className="text-left">
            <DialogTitle>Choisissez votre formule d'accès</DialogTitle>
            <DialogDescription>
              Deux façons d'exploiter les données foncières de la RDC, selon vos besoins.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <section
              aria-labelledby="plan-payg-title"
              className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4"
            >
              <div className="flex items-center gap-2">
                <Receipt aria-hidden="true" className="h-5 w-5 shrink-0 text-primary" />
                <h3 id="plan-payg-title" className="text-base font-semibold text-foreground">
                  Paiement à l'usage
                </h3>
              </div>
              <p className="flex-1 text-sm leading-relaxed text-muted-foreground">
                Accédez aux données foncières de base en ne payant que les visuels qui vous
                intéressent, sans engagement.
              </p>
              <Button
                className="min-h-11 w-full"
                onClick={() => setCatalogOpen(true)}
              >
                Choisir les visuels
                <ArrowRight aria-hidden="true" className="ml-2 h-4 w-4 shrink-0" />
              </Button>
            </section>
            <section
              aria-labelledby="plan-partner-title"
              className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4"
            >
              <div className="flex items-center gap-2">
                <Handshake aria-hidden="true" className="h-5 w-5 shrink-0 text-primary" />
                <h3 id="plan-partner-title" className="text-base font-semibold text-foreground">
                  Devenir Partenaire
                </h3>
              </div>
              <p className="flex-1 text-sm leading-relaxed text-muted-foreground">
                Accès complet à tous les onglets, sans achat à l'unité, dont les données
                importantes : hypothèques, litiges fonciers, valeurs marchandes et leurs
                analyses croisées. Idéal pour les banques, institutions de microfinance,
                coopératives d'épargne et de crédit et sociétés d'assurances.
              </p>
              <Button variant="outline" className="min-h-11 w-full" onClick={goPartnership}>
                Introduire ma demande
                <ArrowRight aria-hidden="true" className="ml-2 h-4 w-4 shrink-0" />
              </Button>
            </section>
          </div>
        </DialogContent>
      </Dialog>
      <AnalyticsCatalogDialog open={catalogOpen} onOpenChange={setCatalogOpen} />
    </>
  );
}
