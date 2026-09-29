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
    <div className="flex shrink-0 items-center gap-2.5 md:gap-3">
      {partner.logo_url ? (
        <img
          src={partner.logo_url}
          alt={ariaHidden ? '' : partner.name}
          className="h-7 md:h-9 w-auto object-contain transition-opacity duration-300 hover:opacity-90"
          loading="lazy"
        />
      ) : (
        <div className="flex h-7 w-7 md:h-9 md:w-9 shrink-0 items-center justify-center rounded-full border border-border/70 bg-muted/60">
          <span className="text-[11px] md:text-sm font-bold text-muted-foreground">
            {partner.name.charAt(0)}
          </span>
        </div>
      )}
      <span
        title={partner.name}
        className="max-w-[9rem] md:max-w-[16rem] truncate text-[11px] md:text-xs font-medium text-muted-foreground transition-colors duration-300 hover:text-foreground"
      >
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
        className="group/item shrink-0 transition-opacity duration-300 hover:opacity-100"
        onClick={() => trackEvent('partner_logo_click', { partner_id: partner.id, name: partner.name })}
      >
        {content}
      </a>
    );
  }
  return <div className="shrink-0">{content}</div>;
};

const PartnerGroup = ({ partners, ariaHidden = false }: { partners: Partner[]; ariaHidden?: boolean }) => (
  <div
    className="flex w-max items-center gap-8 md:gap-12 px-6 md:px-8"
    aria-hidden={ariaHidden || undefined}
  >
    {partners.map((partner) => (
      <PartnerItem key={`${ariaHidden ? 'b' : 'a'}-${partner.id}`} partner={partner} ariaHidden={ariaHidden} />
    ))}
  </div>
);

const PartnersSection = () => {
  const { data: partners = [] } = useQuery({
    queryKey: ['partners', 'active'],
    queryFn: fetchPartners,
    staleTime: 5 * 60 * 1000,
  });

  if (partners.length === 0) return null;

  return (
    <section
      className="relative overflow-hidden border-y border-border/60 bg-background py-4 md:py-5"
      aria-labelledby="partners-heading"
    >
      <div className="mb-3 md:mb-4 text-center">
        <h2
          id="partners-heading"
          className="text-[9px] md:text-[10px] font-medium lowercase tracking-[0.14em] text-muted-foreground/90"
        >
          Ce projet trouve écho auprès de
        </h2>
      </div>
      <div className="relative flex items-center">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-background to-transparent md:w-24"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-background to-transparent md:w-24"
        />
        <div className="flex w-max animate-marquee items-center">
          <PartnerGroup partners={partners} />
          <PartnerGroup partners={partners} ariaHidden />
        </div>
      </div>
    </section>
  );
};

export default PartnersSection;
