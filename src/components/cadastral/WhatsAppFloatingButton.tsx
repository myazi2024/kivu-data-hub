import React from 'react';
import { MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

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

  const handleWhatsAppClick = () => {
    console.log('🔥 Bouton WhatsApp cliqué !');
    alert('Bouton cliqué !'); // Test visuel
    
    const fullMessage = `${message}\n\n📸 Besoin d'aide avec cette page.`;
    const encodedMessage = encodeURIComponent(fullMessage);
    const whatsappUrl = `https://wa.me/${phoneNumber.replace(/[^0-9]/g, '')}?text=${encodedMessage}`;
    
    console.log('🔗 URL WhatsApp:', whatsappUrl);
    console.log('📱 Tentative d\'ouverture de WhatsApp...');
    
    window.open(whatsappUrl, '_blank');
    
    console.log('✅ window.open() exécuté');
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
          <MessageCircle className="h-6 w-6 text-white group-hover/button:rotate-12 transition-transform duration-300" />
          {!isMobile && (
            <span className="text-white font-semibold tracking-wide">
              Besoin d'aide?
            </span>
          )}
        </div>

        {/* Shimmer effect */}
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent opacity-0 group-hover/button:opacity-100 transition-opacity duration-500" />
      </Button>

      {/* Tooltip on hover */}
      <div className="absolute bottom-full right-0 mb-3 opacity-0 group-hover/button:opacity-100 transition-all duration-300 pointer-events-none">
        <div className="bg-gray-900 text-white text-xs px-3 py-2 rounded-lg whitespace-nowrap shadow-lg">
          💬 Demander de l'aide via WhatsApp
          <div className="absolute -bottom-1 right-4 w-2 h-2 bg-gray-900 transform rotate-45" />
        </div>
      </div>
    </div>
  );
};

export default WhatsAppFloatingButton;
