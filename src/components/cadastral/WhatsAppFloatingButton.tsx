import React, { useState } from 'react';
import { MessageCircle, Camera, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import html2canvas from 'html2canvas';
import { toast } from 'sonner';

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

  const handleWhatsAppClick = async () => {
    console.log('🔥 Bouton WhatsApp cliqué !');
    try {
      setIsCapturing(true);
      console.log('📸 Début de la capture d\'écran...');
      toast.info('Capture d\'écran en cours...');

      // Capture d'écran de la page entière
      const canvas = await html2canvas(document.body, {
        allowTaint: true,
        useCORS: true,
        scale: 2,
        logging: true,
        backgroundColor: '#ffffff'
      });
      console.log('✅ Canvas créé:', canvas.width, 'x', canvas.height);

      // Convertir le canvas en blob
      console.log('🔄 Conversion en blob...');
      canvas.toBlob(async (blob) => {
        if (!blob) {
          console.error('❌ Échec de création du blob');
          throw new Error('Échec de la capture d\'écran');
        }

        console.log('✅ Blob créé:', blob.size, 'bytes');
        const file = new File([blob], 'screenshot.png', { type: 'image/png' });

        // Essayer d'utiliser l'API Web Share si disponible
        console.log('📱 Vérification Web Share API...');
        console.log('navigator.share:', !!navigator.share);
        console.log('navigator.canShare:', !!navigator.canShare);
        
        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
          console.log('✅ Web Share API disponible');
          try {
            await navigator.share({
              files: [file],
              title: 'Besoin d\'aide',
              text: message
            });
            console.log('✅ Partage réussi');
            toast.success('Partage en cours...');
          } catch (shareError) {
            console.log('❌ Erreur de partage:', shareError);
            if ((shareError as Error).name !== 'AbortError') {
              // Si le partage échoue, télécharger et ouvrir WhatsApp
              downloadAndOpenWhatsApp(blob);
            }
          }
        } else {
          // Fallback: télécharger la capture et ouvrir WhatsApp
          console.log('⚠️ Web Share API non disponible, fallback...');
          downloadAndOpenWhatsApp(blob);
        }
      }, 'image/png');

    } catch (error) {
      console.error('❌ Erreur lors de la capture:', error);
      console.error('Stack:', (error as Error).stack);
      toast.error('Erreur lors de la capture d\'écran');
      // Ouvrir WhatsApp sans capture en cas d'erreur
      console.log('🔄 Ouverture WhatsApp sans capture...');
      openWhatsApp();
    } finally {
      console.log('🏁 Fin du processus');
      setIsCapturing(false);
    }
  };

  const downloadAndOpenWhatsApp = (blob: Blob) => {
    console.log('💾 Téléchargement de la capture...');
    // Télécharger la capture d'écran
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `capture-aide-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    console.log('✅ Capture téléchargée');
    toast.success('Capture enregistrée ! Veuillez l\'envoyer via WhatsApp.');
    
    // Ouvrir WhatsApp avec le message
    console.log('⏰ Ouverture WhatsApp dans 500ms...');
    setTimeout(() => openWhatsApp(), 500);
  };

  const openWhatsApp = () => {
    console.log('📱 Ouverture de WhatsApp...');
    const fullMessage = `${message}\n\n📸 J'ai pris une capture d'écran que je vais vous envoyer.`;
    const encodedMessage = encodeURIComponent(fullMessage);
    const whatsappUrl = `https://wa.me/${phoneNumber.replace(/[^0-9]/g, '')}?text=${encodedMessage}`;
    console.log('🔗 URL WhatsApp:', whatsappUrl);
    window.open(whatsappUrl, '_blank');
    console.log('✅ WhatsApp ouvert');
  };

  return (
    <div className="fixed bottom-6 right-6 z-[99999] group/button">
      {/* Pulse animation ring */}
      <div className="absolute inset-0 rounded-full bg-[#25D366] opacity-30 animate-ping" 
           style={{ animationDuration: '2s' }} />
      
      {/* Glow effect */}
      <div className="absolute inset-0 rounded-full bg-[#25D366] blur-xl opacity-40 group-hover/button:opacity-60 transition-opacity duration-300" />
      
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
          "backdrop-blur-sm",
          isMobile ? "h-16 w-16" : "h-16 px-6",
          className
        )}
        aria-label="Contacter via WhatsApp avec capture d'écran"
      >
        {/* Animated gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover/button:translate-x-full transition-transform duration-1000" />
        
        {/* Icon with animation */}
        <div className="relative z-10 flex items-center gap-2">
          {isCapturing ? (
            <Loader2 className="h-6 w-6 text-white animate-spin" />
          ) : (
            <>
              <div className="relative">
                <MessageCircle className="h-6 w-6 text-white group-hover/button:rotate-12 transition-transform duration-300" />
                <Camera className="h-3 w-3 text-white absolute -bottom-1 -right-1 opacity-0 group-hover/button:opacity-100 transition-opacity duration-300" />
              </div>
              {!isMobile && (
                <span className="text-white font-semibold tracking-wide">
                  Besoin d'aide?
                </span>
              )}
            </>
          )}
        </div>

        {/* Shimmer effect */}
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent opacity-0 group-hover/button:opacity-100 transition-opacity duration-500" />
      </Button>

      {/* Tooltip on hover */}
      {!isCapturing && (
        <div className="absolute bottom-full right-0 mb-3 opacity-0 group-hover/button:opacity-100 transition-all duration-300 pointer-events-none">
          <div className="bg-gray-900 text-white text-xs px-3 py-2 rounded-lg whitespace-nowrap shadow-lg">
            📸 Capture d'écran + WhatsApp
            <div className="absolute -bottom-1 right-4 w-2 h-2 bg-gray-900 transform rotate-45" />
          </div>
        </div>
      )}
    </div>
  );
};

export default WhatsAppFloatingButton;
