import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, FileText, ShoppingCart, MapPin, Calendar, CreditCard, Minus } from 'lucide-react';
import { useCart, CartItem } from '@/hooks/useCart';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import reportThumbnail from '@/assets/report-card-thumbnail.webp';
import thumbMarket from '@/assets/thumb-market.webp';
import thumbUrban from '@/assets/thumb-urban.webp';
import thumbTax from '@/assets/thumb-tax.webp';
import thumbTerritory from '@/assets/thumb-territory.webp';

interface Publication {
  id: string;
  title: string;
  description?: string;
  price_usd: number;
  status: string;
  category: string;
  cover_image_url?: string;
  created_at: string;
  featured: boolean;
  file_url?: string;
  tags?: string[];
}

interface PublicationCardProps {
  publication: Publication;
}

export const PublicationCard: React.FC<PublicationCardProps> = ({ publication }) => {
  const { addToCart, removeFromCart, isInCart } = useCart();
  const { toast } = useToast();

  // Extract metadata from description or tags
  const getPeriod = () => {
    if (publication.tags?.includes('T1-2025')) return 'Janvier - Mars 2025';
    if (publication.tags?.includes('T2-2025')) return 'Avril - Juin 2025';
    if (publication.tags?.includes('S1-2025')) return 'Janvier - Juin 2025';
    return 'Période non spécifiée';
  };

  const getZone = () => {
    const zones = ['Goma', 'Karisimbi', 'Nyiragongo', 'Les Volcans'];
    const foundZone = publication.tags?.find(tag => zones.includes(tag));
    return foundZone || 'Goma';
  };

  const getPages = () => {
    // Simulate page count based on category
    switch (publication.category) {
      case 'research': return Math.floor(Math.random() * 20) + 25; // 25-45 pages
      case 'analysis': return Math.floor(Math.random() * 15) + 15; // 15-30 pages
      default: return Math.floor(Math.random() * 10) + 20; // 20-30 pages
    }
  };

  const getCategoryThumbnail = (): { src: string; alt: string } => {
    const text = `${publication.title} ${publication.description ?? ''} ${(publication.tags ?? []).join(' ')}`.toLowerCase();

    if (/(fiscal|imp[ôo]t|tax)/.test(text)) {
      return { src: thumbTax, alt: 'Miniature fiscalité locale — impôts et budget' };
    }
    if (/(urban|urbain|urbanisation|ville|quartier|logement)/.test(text)) {
      return { src: thumbUrban, alt: 'Miniature urbanisation — ville et aménagement' };
    }
    if (/(territoire|carte|map|zone|parcelle|cadastre|donn[eé]es)/.test(text)) {
      return { src: thumbTerritory, alt: 'Miniature données territoriales — carte et indicateurs' };
    }
    if (/(march[ée]|market|prix|loyer)/.test(text)) {
      return { src: thumbMarket, alt: 'Miniature marché immobilier — bâtiments et tendance' };
    }

    switch (publication.category) {
      case 'analysis':
        return { src: thumbMarket, alt: 'Miniature marché immobilier — bâtiments et tendance' };
      case 'research':
        return { src: thumbUrban, alt: 'Miniature urbanisation — ville et aménagement' };
      case 'report':
        return { src: thumbTerritory, alt: 'Miniature données territoriales — carte et indicateurs' };
      default:
        return { src: reportThumbnail, alt: 'Miniature de rapport — marché immobilier et données territoriales' };
    }
  };
  const handleAddToCart = () => {
    if (publication.price_usd === 0) {
      // Free download
      if (publication.file_url) {
        window.open(publication.file_url, '_blank');
      }
      return;
    }

    const cartItem: CartItem = {
      id: publication.id,
      title: publication.title,
      price: publication.price_usd,
      cover_image_url: publication.cover_image_url,
      description: publication.description,
      period: getPeriod(),
      zone: getZone(),
      pages: getPages(),
    };

    addToCart(cartItem);
    toast({
      title: "Ajouté au panier",
      description: `${publication.title} a été ajouté à votre panier`,
    });
  };

  const handleBuyNow = async () => {
    if (publication.price_usd === 0) {
      // Free download
      if (publication.file_url) {
        window.open(publication.file_url, '_blank');
      }
      return;
    }

    // Create cart item for immediate purchase
    const cartItem: CartItem = {
      id: publication.id,
      title: publication.title,
      price: publication.price_usd,
      cover_image_url: publication.cover_image_url,
      description: publication.description,
      period: getPeriod(),
      zone: getZone(),
      pages: getPages(),
    };

    // Direct purchase without adding to cart
    try {
      const { data, error } = await supabase.functions.invoke('create-payment', {
        body: {
          items: [cartItem],
        },
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast({
        title: "Erreur de paiement",
        description: "Une erreur est survenue lors du traitement du paiement",
        variant: "destructive",
      });
    }
  };

  const isAlreadyInCart = isInCart(publication.id);
  const isFree = publication.price_usd === 0;
  const isAvailable = publication.status === 'published';
  const thumb = getCategoryThumbnail();

  return (
    <Card className="border-border hover:border-primary/20 transition-all duration-300 h-full flex flex-col">
      {/* Cover Image */}
      <div className="relative h-48 bg-secondary/50 rounded-t-lg overflow-hidden">
        {publication.cover_image_url ? (
          <img
            src={publication.cover_image_url}
            alt={publication.title}
            className="w-full h-full object-cover"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <img
            src={thumb.src}
            alt={thumb.alt}
            className="w-full h-full object-cover"
            loading="lazy"
            decoding="async"
          />
        )}
        {publication.featured && (
          <Badge className="absolute top-2 right-2" variant="default">
            Populaire
          </Badge>
        )}
      </div>

      <CardHeader className="pb-3">
        <div className="flex items-center gap-2 mb-2">
          <Badge variant={isAvailable ? "default" : "secondary"}>
            {isAvailable ? "Disponible" : "Bientôt"}
          </Badge>
          <Badge variant="outline">{getPages()} pages</Badge>
        </div>
        <CardTitle className="text-lg font-semibold text-foreground line-clamp-2">
          {publication.title}
        </CardTitle>
        <CardDescription className="space-y-1">
          <div className="flex items-center gap-1 text-sm">
            <Calendar className="h-3 w-3" />
            {getPeriod()}
          </div>
          <div className="flex items-center gap-1 text-sm">
            <MapPin className="h-3 w-3" />
            {getZone()}
          </div>
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col">
        <p className="text-muted-foreground text-sm leading-relaxed mb-4 line-clamp-3 flex-1">
          {publication.description || "Rapport d'analyse détaillé du marché immobilier avec données territorialisées, indicateurs de performance et projections fiscales."}
        </p>

        {/* Price and Actions */}
        <div className="space-y-3 mt-auto">
          <div className="flex items-center justify-between">
            <div className="text-right">
              {isFree ? (
                <span className="text-lg font-bold text-primary">Gratuit</span>
              ) : (
                <div>
                  <span className="text-2xl font-bold text-foreground">${publication.price_usd}</span>
                  <span className="text-sm text-muted-foreground ml-1">USD</span>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            {/* Preview/Summary Button */}
            <Button variant="outline" size="sm" className="w-full">
              <Download className="mr-2 h-4 w-4" />
              Aperçu gratuit
            </Button>
            
            {/* Action Buttons */}
            {isFree ? (
              <Button
                onClick={handleAddToCart}
                disabled={!isAvailable}
                size="sm"
                className="w-full"
              >
                <Download className="mr-2 h-4 w-4" />
                Télécharger gratuitement
              </Button>
            ) : (
              <div className="flex gap-2">
                {/* Add/Remove from Cart Button */}
                <Button
                  onClick={isAlreadyInCart ? () => removeFromCart(publication.id) : handleAddToCart}
                  disabled={!isAvailable}
                  variant={isAlreadyInCart ? "secondary" : "outline"}
                  size="sm"
                  className="flex-1"
                >
                  {isAlreadyInCart ? (
                    <>
                      <Minus className="mr-2 h-4 w-4" />
                      Retirer
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="mr-2 h-4 w-4" />
                      Panier
                    </>
                  )}
                </Button>
                
                {/* Buy Now Button */}
                <Button
                  onClick={handleBuyNow}
                  disabled={!isAvailable}
                  size="sm"
                  className="flex-1"
                >
                  <CreditCard className="mr-2 h-4 w-4" />
                  Acheter
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};