import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, CreditCard, Gift } from 'lucide-react';
import CadastralClientDashboard from './CadastralClientDashboard';
import ContributorCodesPanel from './ContributorCodesPanel';

const CadastralDashboardTabs: React.FC = () => {
  return (
    <Tabs defaultValue="invoices" className="w-full">
      <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3">
        <TabsTrigger value="invoices" className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          <span className="hidden sm:inline">Factures</span>
          <span className="sm:hidden text-xs">Factures</span>
        </TabsTrigger>
        <TabsTrigger value="codes" className="flex items-center gap-2">
          <Gift className="h-4 w-4" />
          <span className="hidden sm:inline">Codes CCC</span>
          <span className="sm:hidden text-xs">Codes</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="invoices" className="mt-6">
        <CadastralClientDashboard />
      </TabsContent>

      <TabsContent value="codes" className="mt-6">
        <ContributorCodesPanel />
      </TabsContent>
    </Tabs>
  );
};

export default CadastralDashboardTabs;
