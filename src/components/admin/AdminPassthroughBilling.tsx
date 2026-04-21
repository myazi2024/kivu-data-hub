import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Info } from 'lucide-react';
import { PassthroughRulesTab } from './passthrough/PassthroughRulesTab';
import { PassthroughInvoicesTab } from './passthrough/PassthroughInvoicesTab';
import { PassthroughAnomaliesTab } from './passthrough/PassthroughAnomaliesTab';

const AdminPassthroughBilling = () => {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Refacturation pass-through</h1>
        <p className="text-sm text-muted-foreground">Refacturation automatique des frais providers (Stripe, MoMo) aux clients selon des règles configurables.</p>
      </div>

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="flex items-start gap-2 pt-4 text-sm">
          <Info className="h-4 w-4 mt-0.5 text-primary shrink-0" />
          <p>
            Les <strong>règles</strong> définissent quels frais sont refacturés (par revendeur, partenaire, méthode ou global) et avec quel markup.
            Les <strong>factures</strong> sont générées chaque mois (cron 1er à 02:00 UTC) puis validées avant émission.
            Le système bloque toute incohérence entre frais réels et montants refacturés.
          </p>
        </CardContent>
      </Card>

      <Tabs defaultValue="rules">
        <TabsList>
          <TabsTrigger value="rules">Règles</TabsTrigger>
          <TabsTrigger value="invoices">Factures</TabsTrigger>
          <TabsTrigger value="anomalies">Anomalies</TabsTrigger>
        </TabsList>
        <TabsContent value="rules" className="mt-4"><PassthroughRulesTab /></TabsContent>
        <TabsContent value="invoices" className="mt-4"><PassthroughInvoicesTab /></TabsContent>
        <TabsContent value="anomalies" className="mt-4"><PassthroughAnomaliesTab /></TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminPassthroughBilling;
