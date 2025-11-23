import { useEffect, useState } from "react";
import { CreditCard, CheckCircle2, Clock, AlertCircle, Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { usePermitPayment } from "@/hooks/usePermitPayment";

interface PaymentItem {
  label: string;
  amount: number;
  status: "paid" | "pending" | "due";
  dueDate?: Date;
  paidDate?: Date;
}

interface PermitPaymentTrackerProps {
  contributionId: string;
  permitType: "construction" | "regularization";
  status: string;
}

export function PermitPaymentTracker({
  contributionId,
  permitType,
  status,
}: PermitPaymentTrackerProps) {
  const { getPaymentForContribution } = usePermitPayment();
  const [paymentData, setPaymentData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPayment();
  }, [contributionId]);

  const loadPayment = async () => {
    setLoading(true);
    const data = await getPaymentForContribution(contributionId);
    setPaymentData(data);
    setLoading(false);
  };

  if (loading) {
    return (
      <Card className="border-border/50">
        <CardContent className="p-6">
          <div className="text-center text-sm text-muted-foreground">Chargement...</div>
        </CardContent>
      </Card>
    );
  }

  if (!paymentData) {
    return (
      <Card className="border-border/50">
        <CardContent className="p-6">
          <div className="text-center text-sm text-muted-foreground">
            Aucune information de paiement disponible
          </div>
        </CardContent>
      </Card>
    );
  }

  const getFees = (): PaymentItem[] => {
    return paymentData.fee_items.map((item: any) => ({
      label: item.fee_name,
      amount: item.amount_usd,
      status: paymentData.status === 'completed' ? 'paid' : paymentData.status === 'pending' ? 'pending' : 'due',
      paidDate: paymentData.paid_at ? new Date(paymentData.paid_at) : undefined,
    }));
  };

  const fees = getFees();
  const totalAmount = fees.reduce((sum, fee) => sum + fee.amount, 0);
  const paidAmount = fees
    .filter((fee) => fee.status === "paid")
    .reduce((sum, fee) => sum + fee.amount, 0);
  const paymentProgress = (paidAmount / totalAmount) * 100;

  const getStatusIcon = (status: PaymentItem["status"]) => {
    switch (status) {
      case "paid":
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case "due":
        return <AlertCircle className="h-4 w-4 text-orange-600" />;
      case "pending":
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: PaymentItem["status"]) => {
    switch (status) {
      case "paid":
        return (
          <Badge variant="outline" className="border-green-600 text-green-600 bg-green-50">
            Payé
          </Badge>
        );
      case "due":
        return (
          <Badge variant="outline" className="border-orange-600 text-orange-600 bg-orange-50">
            À payer
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="outline" className="text-muted-foreground">
            En attente
          </Badge>
        );
    }
  };

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-primary" />
            Suivi financier
          </span>
          <Badge variant="outline" className="text-xs font-mono">
            {paidAmount}$ / {totalAmount}$
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Barre de progression */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progression des paiements</span>
            <span className="font-semibold">{Math.round(paymentProgress)}%</span>
          </div>
          <Progress value={paymentProgress} className="h-2" />
        </div>

        <Separator />

        {/* Liste des frais */}
        <div className="space-y-3">
          {fees.map((fee, index) => (
            <div
              key={index}
              className="flex items-start justify-between gap-3 rounded-lg border border-border/50 bg-background/50 p-3 transition-colors hover:bg-muted/30"
            >
              <div className="flex items-start gap-3 flex-1 min-w-0">
                {getStatusIcon(fee.status)}
                <div className="flex-1 min-w-0 space-y-1">
                  <p className="text-sm font-medium leading-tight">{fee.label}</p>
                  {fee.status === "paid" && fee.paidDate && (
                    <p className="text-xs text-muted-foreground">
                      Payé le {format(fee.paidDate, "d MMM yyyy", { locale: fr })}
                    </p>
                  )}
                  {fee.status === "due" && fee.dueDate && (
                    <p className="text-xs text-orange-600">
                      À payer avant le {format(fee.dueDate, "d MMM yyyy", { locale: fr })}
                    </p>
                  )}
                  {fee.status === "pending" && (
                    <p className="text-xs text-muted-foreground">
                      Paiement requis après approbation
                    </p>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-end gap-2 flex-shrink-0">
                <span className="text-sm font-bold">{fee.amount}$</span>
                {getStatusBadge(fee.status)}
              </div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="space-y-2 pt-2">
          {fees.some((fee) => fee.status === "due") && (
            <Button className="w-full gap-2" size="sm">
              <CreditCard className="h-4 w-4" />
              Effectuer le paiement ({fees.filter((f) => f.status === "due").reduce((sum, f) => sum + f.amount, 0)}$)
            </Button>
          )}
          {fees.some((fee) => fee.status === "paid") && (
            <Button variant="outline" className="w-full gap-2" size="sm">
              <Download className="h-4 w-4" />
              Télécharger les reçus
            </Button>
          )}
        </div>

        {/* Informations complémentaires */}
        <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
          <p className="font-medium mb-1">Modes de paiement acceptés :</p>
          <ul className="list-disc list-inside space-y-0.5">
            <li>Mobile Money (M-Pesa, Orange Money, Airtel Money)</li>
            <li>Virement bancaire</li>
            <li>Paiement en espèces au guichet</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
