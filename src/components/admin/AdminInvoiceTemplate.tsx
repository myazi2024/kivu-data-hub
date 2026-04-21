import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Building2, Receipt, Palette, Eye } from 'lucide-react';
import CompanyLegalInfoForm from './invoice-template/CompanyLegalInfoForm';
import InvoiceFiscalSettingsForm from './invoice-template/InvoiceFiscalSettingsForm';
import InvoiceLayoutForm from './invoice-template/InvoiceLayoutForm';
import InvoicePreviewPanel from './invoice-template/InvoicePreviewPanel';

export const AdminInvoiceTemplate = () => {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5 text-primary" />
            Modèle de facture
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Source unique de vérité pour la mise en page et les données légales utilisées par toutes les factures de l'application
            (catalogue cadastral, paiements, dashboard client, PDF générés).
          </p>
        </CardHeader>
      </Card>

      <Tabs defaultValue="identity" className="space-y-4">
        <TabsList className="grid grid-cols-2 md:grid-cols-4 w-full">
          <TabsTrigger value="identity" className="gap-2"><Building2 className="h-4 w-4" />Identité</TabsTrigger>
          <TabsTrigger value="fiscal" className="gap-2"><Receipt className="h-4 w-4" />Fiscalité</TabsTrigger>
          <TabsTrigger value="layout" className="gap-2"><Palette className="h-4 w-4" />Mise en page</TabsTrigger>
          <TabsTrigger value="preview" className="gap-2"><Eye className="h-4 w-4" />Aperçu</TabsTrigger>
        </TabsList>

        <TabsContent value="identity"><CompanyLegalInfoForm /></TabsContent>
        <TabsContent value="fiscal"><InvoiceFiscalSettingsForm /></TabsContent>
        <TabsContent value="layout"><InvoiceLayoutForm /></TabsContent>
        <TabsContent value="preview"><InvoicePreviewPanel /></TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminInvoiceTemplate;
