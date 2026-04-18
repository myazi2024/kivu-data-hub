import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { trackEvent } from '@/lib/analytics';

interface Partner {
  id: string;
  name: string;
  logo_url: string | null;
  website_url: string | null;
}

const fetchPartners = async (): Promise<Partner[]> => {
  const { data, error } = await supabase
    .from('partners')
    .select('id, name, logo_url, website_url')
    .eq('is_active', true)
    .is('deleted_at', null)
    .order('display_order', { ascending: true });
  if (error) throw error;
  return (data ?? []) as Partner[];
};

const PartnerItem = ({ partner, ariaHidden = false }: { partner: Partner; ariaHidden?: boolean }) => {
  const content = (
    <div className="flex flex-col items-center gap-2 px-6 md:px-10 min-w-[140px] md:min-w-[180px]">
      {partner.logo_url ? (
        <img
          src={partner.logo_url}
          alt={ariaHidden ? '' : partner.name}
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

  if (partner.website_url && !ariaHidden) {
    return (
      <a
        href={partner.website_url}
        target="_blank"
        rel="noopener noreferrer"
        className="hover:opacity-80 transition-opacity"
        onClick={() => trackEvent('partner_logo_click', { partner_id: partner.id, name: partner.name })}
      >
        {content}
      </a>
    );
  }
  return content;
};

const PartnersSection = () => {
  const { data: partners = [] } = useQuery({
    queryKey: ['partners', 'active'],
    queryFn: fetchPartners,
    staleTime: 5 * 60 * 1000,
  });

  if (partners.length === 0) return null;

  return (
    <section className="py-10 md:py-16 bg-muted/30 overflow-hidden" aria-labelledby="partners-heading">
      <div className="container mx-auto px-4 mb-6 md:mb-8">
        <h2 id="partners-heading" className="text-xl md:text-2xl font-bold text-center text-foreground">
          Ce projet trouve écho auprès de
        </h2>
      </div>
      <div className="relative">
        <div className="flex animate-marquee">
          {/* Real partners (visible to AT) */}
          {partners.map((partner) => (
            <PartnerItem key={`a-${partner.id}`} partner={partner} />
          ))}
          {/* Visual duplicate for seamless scroll, hidden from AT */}
          <div className="flex" aria-hidden="true">
            {partners.map((partner) => (
              <PartnerItem key={`b-${partner.id}`} partner={partner} ariaHidden />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default PartnersSection;
