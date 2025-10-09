import React, { useEffect, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Gift, Tag } from 'lucide-react';
import CadastralClientDashboard from './CadastralClientDashboard';
import ContributorCodesPanel from './ContributorCodesPanel';
import { useAuth } from '@/hooks/useAuth';
import { useResellers } from '@/hooks/useResellers';
import { useDiscountCodes } from '@/hooks/useDiscountCodes';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const CadastralDashboardTabs: React.FC = () => {
  const { profile } = useAuth();
  const { currentReseller } = useResellers();
  const { codes } = useDiscountCodes();
  const { toast } = useToast();
  const [isReseller, setIsReseller] = useState(false);

  useEffect(() => {
    setIsReseller(profile?.role === 'partner' && !!currentReseller);
  }, [profile, currentReseller]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copié",
      description: "Le code a été copié dans le presse-papiers",
    });
  };

  const getCodeStatus = (code: any) => {
    if (!code.is_active) return { label: 'Inactif', variant: 'secondary' as const };
    if (code.expires_at && new Date(code.expires_at) < new Date()) {
      return { label: 'Expiré', variant: 'destructive' as const };
    }
    if (code.max_usage && code.usage_count >= code.max_usage) {
      return { label: 'Épuisé', variant: 'secondary' as const };
    }
    return { label: 'Actif', variant: 'default' as const };
  };

  return (
    <Tabs defaultValue="invoices" className="w-full">
      <TabsList className={`grid w-full ${isReseller ? 'grid-cols-3' : 'grid-cols-2'}`}>
        <TabsTrigger value="invoices" className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          <span className="hidden sm:inline">Factures</span>
          <span className="sm:hidden text-xs">Factures</span>
        </TabsTrigger>
        <TabsTrigger value="codes" className="flex items-center gap-2">
          <Gift className="h-4 w-4" />
          <span className="hidden sm:inline">Codes CCC</span>
          <span className="sm:hidden text-xs">CCC</span>
        </TabsTrigger>
        {isReseller && (
          <TabsTrigger value="discount-codes" className="flex items-center gap-2">
            <Tag className="h-4 w-4" />
            <span className="hidden sm:inline">Codes Remise</span>
            <span className="sm:hidden text-xs">Remise</span>
          </TabsTrigger>
        )}
      </TabsList>

      <TabsContent value="invoices" className="mt-6">
        <CadastralClientDashboard />
      </TabsContent>

      <TabsContent value="codes" className="mt-6">
        <ContributorCodesPanel />
      </TabsContent>

      {isReseller && (
        <TabsContent value="discount-codes" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Tag className="h-5 w-5 text-primary" />
                Mes Codes de Remise
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Partagez ces codes avec vos clients pour obtenir des commissions
              </p>
            </CardHeader>
            <CardContent>
              {codes.length === 0 ? (
                <div className="text-center py-12">
                  <Tag className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">Aucun code de remise</h3>
                  <p className="text-muted-foreground text-sm">
                    Contactez l'administrateur pour créer vos codes de remise.
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {codes.map((code) => {
                    const status = getCodeStatus(code);
                    return (
                      <Card key={code.id} className="border-primary/20 hover:border-primary/40 transition-colors">
                        <CardContent className="p-4">
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-lg">{code.code}</span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => copyToClipboard(code.code)}
                                  className="h-7 w-7 p-0"
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                              <Badge variant={status.variant}>{status.label}</Badge>
                            </div>
                            
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Remise:</span>
                                <span className="font-medium">
                                  {code.discount_percentage > 0 && `${code.discount_percentage}%`}
                                  {code.discount_amount_usd > 0 && `${code.discount_amount_usd} USD`}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Utilisations:</span>
                                <span className="font-medium">
                                  {code.usage_count}
                                  {code.max_usage ? `/${code.max_usage}` : ' (illimité)'}
                                </span>
                              </div>
                              {code.expires_at && (
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Expire le:</span>
                                  <span className="font-medium">
                                    {new Date(code.expires_at).toLocaleDateString('fr-FR')}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      )}
    </Tabs>
  );
};

export default CadastralDashboardTabs;
