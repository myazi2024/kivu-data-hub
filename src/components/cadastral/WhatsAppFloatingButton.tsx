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
  message = 'Bonjour, j\'ai besoin d\'aide pour remplir le formulaire CCC.',
  className
}) => {
  const isMobile = useIsMobile();

  const handleWhatsAppClick = () => {
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${phoneNumber.replace(/[^0-9]/g, '')}?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <Button
      onClick={handleWhatsAppClick}
      className={cn(
        "fixed bottom-6 right-6 z-[99999] rounded-full shadow-2xl",
        "bg-gradient-to-r from-[#25D366] via-[#25D366] to-[#128C7E]",
        "hover:scale-110 hover:shadow-[0_0_30px_rgba(37,211,102,0.5)]",
        "transition-all duration-300 group overflow-hidden",
        "border-2 border-white/20",
        isMobile ? "h-14 w-14" : "h-14 px-6",
        className
      )}
      aria-label="Contacter via WhatsApp"
    >
      <MessageCircle className="h-6 w-6 text-white relative z-10 group-hover:rotate-12 transition-transform duration-300" />
      {!isMobile && (
        <span className="ml-2 text-white font-medium relative z-10">
          Besoin d'aide?
        </span>
      )}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
    </Button>
  );
};

export default WhatsAppFloatingButton;
