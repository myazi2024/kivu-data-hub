import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Partner {
  id: string;
  name: string;
  logo_url: string | null;
  website_url: string | null;
}

const PartnersSection = () => {
  const [partners, setPartners] = useState<Partner[]>([]);

  useEffect(() => {
    const fetchPartners = async () => {
      const { data } = await (supabase as any)
        .from('partners')
        .select('id, name, logo_url, website_url')
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      if (data) setPartners(data as Partner[]);
    };
    fetchPartners();
  }, []);

  if (partners.length === 0) return null;

  // Duplicate for infinite scroll effect
  const scrollItems = [...partners, ...partners];

  const PartnerItem = ({ partner }: { partner: Partner }) => {
    const content = (
      <div className="flex flex-col items-center gap-2 px-6 md:px-10 min-w-[140px] md:min-w-[180px]">
        {partner.logo_url ? (
          <img
            src={partner.logo_url}
            alt={partner.name}
            className="h-12 md:h-16 w-auto object-contain grayscale hover:grayscale-0 transition-all duration-300"
            loading="lazy"
          />
        ) : (
          <div className="h-12 md:h-16 w-12 md:w-16 rounded-full bg-muted flex items-center justify-center">
            <span className="text-lg md:text-xl font-bold text-muted-foreground">
              {partner.name.charAt(0)}
            </span>
          </div>
        )}
        <span className="text-xs md:text-sm text-muted-foreground font-medium whitespace-nowrap">
          {partner.name}
        </span>
      </div>
    );

    if (partner.website_url) {
      return (
        <a
          href={partner.website_url}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:opacity-80 transition-opacity"
        >
          {content}
        </a>
      );
    }
    return content;
  };

  return (
    <section className="py-10 md:py-16 bg-muted/30 overflow-hidden">
      <div className="container mx-auto px-4 mb-6 md:mb-8">
        <h2 className="text-xl md:text-2xl font-bold text-center text-foreground">
          Nos Partenaires
        </h2>
        <p className="text-sm text-muted-foreground text-center mt-2">
          Ils nous font confiance
        </p>
      </div>
      <div className="relative">
        <div className="flex animate-marquee">
          {scrollItems.map((partner, i) => (
            <PartnerItem key={`${partner.id}-${i}`} partner={partner} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default PartnersSection;
