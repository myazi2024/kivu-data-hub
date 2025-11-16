import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, FileText, ShoppingCart, MapPin, Calendar, CreditCard, Minus } from 'lucide-react';
import { useCart, CartItem } from '@/hooks/useCart';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import reportThumbnail from '@/assets/report-card-thumbnail.webp';

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
        return;
      }
      toast({
        title: "Téléchargement indisponible",
        description: "Le fichier n'est pas encore disponible",
        variant: "destructive",
      });
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
      // SECURITY: Send only item ID, price will be fetched from database
      const { data, error } = await supabase.functions.invoke('create-payment', {
        body: {
          items: [publication.id],
        },
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, '_blank');
      } else {
        throw new Error('URL de paiement non reçue');
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

  return (
    <Card className="border-border hover:border-primary/20 transition-all duration-300 h-full flex flex-col focus-visible-ring hover-interactive contrast-aa">
      {/* Cover Image - Compact */}
      <div className="relative h-28 sm:h-32 bg-secondary/50 rounded-t-lg overflow-hidden">
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
            src={reportThumbnail}
            alt="Miniature de rapport — marché immobilier et données territoriales"
            className="w-full h-full object-cover"
            loading="lazy"
            decoding="async"
          />
        )}
        {publication.featured && (
          <Badge className="absolute top-1 right-1 text-xs px-1.5 py-0.5" variant="default">
            Populaire
          </Badge>
        )}
      </div>

      <CardHeader className="p-2 sm:p-3 pb-1">
        <div className="flex items-center gap-1 mb-1">
          <Badge variant={isAvailable ? "default" : "secondary"} className="text-xs px-1.5 py-0.5">
            {isAvailable ? "Disponible" : "Bientôt"}
          </Badge>
          <Badge variant="outline" className="text-xs px-1.5 py-0.5">{getPages()}p</Badge>
        </div>
        <CardTitle className="text-sm sm:text-base font-semibold text-foreground line-clamp-2 leading-tight mb-1">
          {publication.title}
        </CardTitle>
        <CardDescription className="space-y-0.5 text-xs">
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">{getPeriod()}</span>
          </div>
          <div className="flex items-center gap-1">
            <MapPin className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">{getZone()}</span>
          </div>
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-2 sm:p-3 pt-0">
        <p className="text-muted-foreground text-xs leading-relaxed mb-2 line-clamp-2 flex-1">
          {publication.description || "Rapport d'analyse détaillé du marché immobilier."}
        </p>

        {/* Price and Actions - Compact */}
        <div className="space-y-2 mt-auto">
          <div className="text-center">
            {isFree ? (
              <span className="text-sm font-bold text-primary">Gratuit</span>
            ) : (
              <div>
                <span className="text-lg font-bold text-foreground">${publication.price_usd}</span>
                <span className="text-xs text-muted-foreground ml-1">USD</span>
              </div>
            )}
          </div>

          <div className="space-y-1">
            {/* Action Buttons - Simplified */}
            {isFree ? (
              <Button
                onClick={handleAddToCart}
                disabled={!isAvailable}
                size="sm"
                className="w-full text-xs h-7"
              >
                <Download className="mr-1 h-3 w-3" />
                Télécharger
              </Button>
            ) : (
              <div className="flex gap-1">
                <Button
                  onClick={isAlreadyInCart ? () => removeFromCart(publication.id) : handleAddToCart}
                  disabled={!isAvailable}
                  variant={isAlreadyInCart ? "secondary" : "outline"}
                  size="sm"
                  className="flex-1 text-xs h-7"
                >
                  {isAlreadyInCart ? (
                    <Minus className="h-3 w-3" />
                  ) : (
                    <ShoppingCart className="h-3 w-3" />
                  )}
                </Button>
                
                <Button
                  onClick={handleBuyNow}
                  disabled={!isAvailable}
                  size="sm"
                  className="flex-1 text-xs h-7"
                >
                  <CreditCard className="mr-1 h-3 w-3" />
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