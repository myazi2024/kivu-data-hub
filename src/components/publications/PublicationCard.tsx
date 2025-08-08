import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, FileText, ShoppingCart, MapPin, Calendar, BookOpen } from 'lucide-react';
import { useCart, CartItem } from '@/hooks/useCart';
import { useToast } from '@/hooks/use-toast';

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
  const { addToCart, isInCart } = useCart();
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

  const isAlreadyInCart = isInCart(publication.id);
  const isFree = publication.price_usd === 0;
  const isAvailable = publication.status === 'published';

  return (
    <Card className="border-border hover:border-primary/20 transition-all duration-300 h-full flex flex-col">
      {/* Cover Image */}
      <div className="relative h-48 bg-secondary/50 rounded-t-lg overflow-hidden">
        {publication.cover_image_url ? (
          <img
            src={publication.cover_image_url}
            alt={publication.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <FileText className="h-16 w-16 text-muted-foreground" />
          </div>
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

          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1">
              <Download className="mr-2 h-4 w-4" />
              Résumé
            </Button>
            <Button
              onClick={handleAddToCart}
              disabled={!isAvailable || isAlreadyInCart}
              size="sm"
              className="flex-1"
              variant={isFree ? "default" : "default"}
            >
              {isFree ? (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Télécharger
                </>
              ) : isAlreadyInCart ? (
                "Dans le panier"
              ) : (
                <>
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  Ajouter
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};