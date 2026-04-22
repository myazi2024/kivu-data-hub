import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Settings2, DollarSign, History } from 'lucide-react';
import { LocalMobileMoney, LocalBankCard, AuditEntry } from './types';

interface Props {
  mobileMoney: LocalMobileMoney[];
  bankCard: LocalBankCard;
  paymentEnabled: boolean;
  isTestModeActive: boolean;
  auditHistory: AuditEntry[];
}

export const PaymentSummaryCard: React.FC<Props> = ({
  mobileMoney, bankCard, paymentEnabled, isTestModeActive, auditHistory,
}) => {
  return (
    <>
      <Card>
        <CardHeader className="p-4 md:p-6">
          <div className="flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-primary" />
            <CardTitle className="text-base md:text-lg">Résumé de la Configuration</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-0 md:p-6 md:pt-0">
          <div className="grid gap-3 text-sm">
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-muted-foreground">Mobile Money actif</span>
              <span className="font-medium">
                {mobileMoney.filter((p) => p.is_enabled).length} / {mobileMoney.length}
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-muted-foreground">Carte bancaire</span>
              <Badge variant={bankCard.is_enabled ? 'default' : 'secondary'}>
                {bankCard.is_enabled ? 'Activé' : 'Désactivé'}
              </Badge>
            </div>
            {bankCard.is_enabled && (
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-muted-foreground">Fournisseur</span>
                <span className="font-medium capitalize">{bankCard.provider}</span>
              </div>
            )}
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-muted-foreground">Devises supportées</span>
              <div className="flex gap-1.5">
                <Badge variant="outline" className="text-xs">
                  <DollarSign className="h-3 w-3 mr-0.5" />USD
                </Badge>
                <Badge variant="outline" className="text-xs">CDF</Badge>
              </div>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-muted-foreground">Paiement requis</span>
              <Badge variant={paymentEnabled ? 'default' : 'secondary'}>
                {paymentEnabled ? 'Oui' : 'Non (accès gratuit)'}
              </Badge>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-muted-foreground">Mode test global</span>
              <Badge variant={isTestModeActive ? 'default' : 'secondary'}>
                {isTestModeActive ? 'Actif' : 'Inactif'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {auditHistory.length > 0 && (
        <Card>
          <CardHeader className="p-4 md:p-6">
            <div className="flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              <CardTitle className="text-base md:text-lg">Historique des modifications</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0 md:p-6 md:pt-0">
            <div className="space-y-2">
              {auditHistory.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between py-2 border-b last:border-0 text-sm">
                  <div>
                    <span className="font-medium">{entry.admin_name || 'Admin'}</span>
                    <span className="text-muted-foreground"> — Configuration mise à jour</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(entry.created_at).toLocaleDateString('fr-FR', {
                      day: '2-digit', month: 'short', year: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
};
