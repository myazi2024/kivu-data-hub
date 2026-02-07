import React, { useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import html2canvas from 'html2canvas';
import { toast } from '@/hooks/use-toast';

interface WhatsAppFloatingButtonProps {
  phoneNumber?: string;
  message?: string;
  className?: string;
}

const WhatsAppFloatingButton: React.FC<WhatsAppFloatingButtonProps> = ({
  phoneNumber = '+243816996077',
  message = 'Bonjour, j\'ai besoin d\'aide avec cette page.',
  className
}) => {
  const isMobile = useIsMobile();
  const [isCapturing, setIsCapturing] = useState(false);

  const handleWhatsAppClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('🔥 Bouton WhatsApp cliqué !');
    setIsCapturing(true);
    
    toast({
      title: "📸 Capture en cours...",
      description: "Préparation de votre capture d'écran",
    });

    try {
      const canvas = await html2canvas(document.body, {
        allowTaint: true,
        useCORS: true,
        logging: false,
        scale: 0.5,
      });

      // Convertir le canvas en Blob
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => resolve(blob!), 'image/jpeg', 0.7);
      });

      console.log('✅ Capture d\'écran réussie');

      // Télécharger l'image
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'capture-ecran.jpg';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "📥 Image téléchargée",
        description: "Ouvrez WhatsApp et joignez l'image téléchargée",
        duration: 5000,
      });

      const fullMessage = `${message}\n\n📸 Voir la capture d'écran ci-jointe`;
      const encodedMessage = encodeURIComponent(fullMessage);
      const whatsappUrl = `https://wa.me/${phoneNumber.replace(/[^0-9]/g, '')}?text=${encodedMessage}`;
      window.open(whatsappUrl, '_blank');

      console.log('✅ Image téléchargée et WhatsApp ouvert');
    } catch (error) {
      console.error('❌ Erreur lors de la capture:', error);
      toast({
        title: "Erreur",
        description: "Impossible de capturer l'écran. Ouverture de WhatsApp...",
        variant: "destructive",
      });

      const fallbackMessage = `${message}\n\nBesoin d'aide avec cette page.`;
      const encodedMessage = encodeURIComponent(fallbackMessage);
      const whatsappUrl = `https://wa.me/${phoneNumber.replace(/[^0-9]/g, '')}?text=${encodedMessage}`;
      window.open(whatsappUrl, '_blank');
    } finally {
      setIsCapturing(false);
    }
  };


  return (
    <div data-whatsapp-button="true" className={cn(
      "fixed z-[1300] group/button pointer-events-auto",
      isMobile ? "bottom-3 right-3" : "bottom-6 right-6"
    )}>
      {/* Pulse animation ring */}
      <div className={cn(
        "absolute inset-0 rounded-full bg-[#25D366] opacity-30 animate-ping",
      )} style={{ animationDuration: '2s' }} />
      
      <Button
        onClick={handleWhatsAppClick}
        disabled={isCapturing}
        className={cn(
          "relative rounded-full shadow-2xl",
          "bg-gradient-to-br from-[#25D366] via-[#20BA5A] to-[#128C7E]",
          "hover:scale-110 hover:shadow-[0_0_40px_rgba(37,211,102,0.6)]",
          "active:scale-95",
          "transition-all duration-300 overflow-hidden",
          "border-2 border-white/30",
          isMobile ? "h-12 w-12 p-0 min-w-0" : "h-14 px-5",
          className
        )}
        aria-label="Contacter via WhatsApp avec capture d'écran"
      >
        <div className="relative z-10 flex items-center gap-2">
          <MessageCircle className={cn(
            "text-white group-hover/button:rotate-12 transition-transform duration-300",
            isMobile ? "h-5 w-5" : "h-6 w-6"
          )} />
          {!isMobile && (
            <span className="text-white font-semibold tracking-wide text-sm">
              {isCapturing ? 'Capture...' : 'Aide?'}
            </span>
          )}
        </div>
      </Button>

      {/* Tooltip on hover - desktop only */}
      {!isMobile && (
        <div className="absolute bottom-full right-0 mb-3 opacity-0 group-hover/button:opacity-100 transition-all duration-300 pointer-events-none">
          <div className="bg-foreground text-background text-xs px-3 py-2 rounded-lg whitespace-nowrap shadow-lg">
            💬 Aide via WhatsApp
            <div className="absolute -bottom-1 right-4 w-2 h-2 bg-foreground transform rotate-45" />
          </div>
        </div>
      )}
    </div>
  );
};

export default WhatsAppFloatingButton;
