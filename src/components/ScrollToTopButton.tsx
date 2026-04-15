import { useState, useEffect } from 'react';
import { ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';

const ScrollToTopButton = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > 300);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (!visible) return null;

  return (
    <Button
      size="icon"
      variant="outline"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className="fixed bottom-4 right-4 z-30 h-9 w-9 rounded-full shadow-md bg-background/80 backdrop-blur-sm border-border/50 text-muted-foreground hover:text-primary transition-all animate-fade-in"
      aria-label="Retour en haut"
    >
      <ChevronUp className="h-4 w-4" />
    </Button>
  );
};

export default ScrollToTopButton;
