import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  DollarSign, 
  TrendingUp, 
  Users, 
  Calendar,
  Copy,
  Eye,
  Tag,
  BarChart3
} from 'lucide-react';
import { useResellers } from '@/hooks/useResellers';
import { useDiscountCodes } from '@/hooks/useDiscountCodes';
import { useResellerSales } from '@/hooks/useResellerSales';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

const ResellerDashboard: React.FC = () => {
  const { currentReseller, loading: resellersLoading } = useResellers();
  const { codes, loading: codesLoading } = useDiscountCodes();
  const { sales, stats, loading: salesLoading } = useResellerSales();
  const { user } = useAuth();
  const { toast } = useToast();

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copié !",
      description: "Le code a été copié dans le presse-papier"
    });
  };

  const getCodeUsageStatus = (code: any) => {
    if (!code.is_active) return { status: 'Inactif', color: 'bg-gray-500' };
    if (code.expires_at && new Date(code.expires_at) < new Date()) {
      return { status: 'Expiré', color: 'bg-red-500' };
    }
    if (code.max_usage && code.usage_count >= code.max_usage) {
      return { status: 'Épuisé', color: 'bg-orange-500' };
    }
    return { status: 'Actif', color: 'bg-green-500' };
  };

  if (resellersLoading || codesLoading || salesLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            <span className="ml-2">Chargement du tableau de bord...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!currentReseller) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <div className="space-y-4">
            <div className="text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4" />
              <h3 className="text-lg font-semibold">Compte revendeur non configuré</h3>
              <p>Contactez l'administrateur pour configurer votre compte revendeur.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header avec informations du revendeur */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Tag className="h-5 w-5" />
                Tableau de bord revendeur
              </CardTitle>
              <p className="text-muted-foreground">
                Code revendeur : <Badge variant="outline" className="font-mono">{currentReseller.reseller_code}</Badge>
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground">
                {currentReseller.business_name || 'Nom d\'entreprise non renseigné'}
              </div>
              <div className="text-xs text-muted-foreground">
                Commission : {currentReseller.fixed_commission_usd > 0 
                  ? `$${currentReseller.fixed_commission_usd} fixe`
                  : `${currentReseller.commission_rate}%`
                }
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{stats.salesCount}</p>
                <p className="text-xs text-muted-foreground">Ventes générées</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">${stats.totalSales.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">Volume total</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-8 w-8 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">${stats.totalCommission.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">Commission totale</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Calendar className="h-8 w-8 text-orange-500" />
              <div>
                <p className="text-2xl font-bold">${stats.pendingCommission.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">En attente</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Contenu principal avec onglets */}
      <Tabs defaultValue="codes" className="space-y-4">
        <TabsList>
          <TabsTrigger value="codes">Mes Codes de Remise</TabsTrigger>
          <TabsTrigger value="sales">Historique des Ventes</TabsTrigger>
        </TabsList>

        <TabsContent value="codes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Tag className="h-5 w-5" />
                Codes de remise disponibles
              </CardTitle>
            </CardHeader>
            <CardContent>
              {codes.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <Tag className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Aucun code de remise configuré</p>
                  <p className="text-sm">Contactez l'administrateur pour créer vos codes.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Remise</TableHead>
                      <TableHead>Utilisations</TableHead>
                      <TableHead>Expire le</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {codes.map((code) => {
                      const statusInfo = getCodeUsageStatus(code);
                      return (
                        <TableRow key={code.id}>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Badge variant="outline" className="font-mono">
                                {code.code}
                              </Badge>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyToClipboard(code.code)}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell>
                            {code.discount_percentage > 0 && (
                              <span>{code.discount_percentage}%</span>
                            )}
                            {code.discount_amount_usd > 0 && (
                              <span>${code.discount_amount_usd}</span>
                            )}
                            {code.discount_percentage === 0 && code.discount_amount_usd === 0 && (
                              <span className="text-muted-foreground">Non configuré</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <span>{code.usage_count}</span>
                              {code.max_usage && (
                                <span className="text-muted-foreground">/{code.max_usage}</span>
                              )}
                              {!code.max_usage && (
                                <span className="text-muted-foreground"> (illimité)</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {code.expires_at ? (
                              <span className="text-sm">
                                {new Date(code.expires_at).toLocaleDateString()}
                              </span>
                            ) : (
                              <span className="text-muted-foreground text-sm">Jamais</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant="outline" 
                              className={`${statusInfo.color} text-white border-0`}
                            >
                              {statusInfo.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4 mr-1" />
                              Détails
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sales" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Historique des ventes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {sales.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Aucune vente enregistrée</p>
                  <p className="text-sm">Les ventes générées via vos codes apparaîtront ici.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Facture</TableHead>
                      <TableHead>Montant vente</TableHead>
                      <TableHead>Remise appliquée</TableHead>
                      <TableHead>Commission</TableHead>
                      <TableHead>Statut paiement</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sales.map((sale) => (
                      <TableRow key={sale.id}>
                        <TableCell>
                          <span className="text-sm">
                            {new Date(sale.created_at).toLocaleDateString()}
                          </span>
                        </TableCell>
                        <TableCell>
                          {(sale as any).cadastral_invoices?.invoice_number || 'N/A'}
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">${sale.sale_amount_usd.toFixed(2)}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-green-600">
                            -${sale.discount_applied_usd.toFixed(2)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium text-primary">
                            ${sale.commission_earned_usd.toFixed(2)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={sale.commission_paid ? "default" : "secondary"}
                          >
                            {sale.commission_paid ? 'Payé' : 'En attente'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ResellerDashboard;