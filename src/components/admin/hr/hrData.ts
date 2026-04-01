export interface Department {
  id: string;
  name: string;
  icon: string;
  color: string;
  headcount: number;
  description: string;
}

export interface JobPosition {
  id: string;
  title: string;
  department: string;
  contractType: string;
  location: string;
  experience: string;
  salary: string;
  status: 'open' | 'filled' | 'paused';
  description: string;
  missions: string[];
  skills: string[];
  publishedAt: string;
}

export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  department: string;
  position: string;
  status: 'active' | 'leave' | 'departed';
  hireDate: string;
  manager?: string;
  avatar?: string;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  type: 'annual' | 'sick' | 'maternity' | 'unpaid' | 'other';
  startDate: string;
  endDate: string;
  status: 'pending' | 'approved' | 'rejected';
  reason: string;
}

export interface PerformanceReview {
  id: string;
  employeeId: string;
  employeeName: string;
  reviewDate: string;
  period: string;
  overallRating: number;
  objectives: { title: string; progress: number; status: string }[];
  comments: string;
  reviewer: string;
}

export const departments: Department[] = [
  { id: 'tech', name: 'Technique', icon: 'Code', color: 'hsl(var(--primary))', headcount: 5, description: 'Développement, infrastructure et design' },
  { id: 'ops', name: 'Opérations', icon: 'ClipboardList', color: 'hsl(var(--chart-2))', headcount: 4, description: 'Cadastre, validation et gestion foncière' },
  { id: 'commercial', name: 'Commercial', icon: 'TrendingUp', color: 'hsl(var(--chart-3))', headcount: 3, description: 'Partenariats, marketing et communication' },
  { id: 'support', name: 'Support Client', icon: 'Headphones', color: 'hsl(var(--chart-4))', headcount: 3, description: 'Assistance, formation et accompagnement' },
  { id: 'direction', name: 'Direction Générale', icon: 'Crown', color: 'hsl(var(--chart-5))', headcount: 1, description: 'Pilotage stratégique et coordination' },
];

export const defaultJobOffers: JobPosition[] = [
  {
    id: 'job-001',
    title: 'Lead Développeur Full-Stack',
    department: 'tech',
    contractType: 'CDI',
    location: 'Kinshasa / Remote',
    experience: '5+ ans',
    salary: '3 000 – 5 000 USD/mois',
    status: 'open',
    publishedAt: '2026-03-15',
    description: "Pilote l'architecture technique de la plateforme cadastrale, supervise l'équipe de développement et garantit la qualité du code et la scalabilité de l'application.",
    missions: [
      "Définir l'architecture technique et les choix technologiques",
      "Superviser et mentorer l'équipe de développement (3-4 devs)",
      "Développer les fonctionnalités critiques (paiements, sécurité, API)",
      "Assurer les revues de code et maintenir les standards de qualité",
      "Collaborer avec le Product Owner pour les priorités de développement",
      "Gérer les déploiements et la stabilité de la production"
    ],
    skills: [
      "React/TypeScript (expert), Supabase/PostgreSQL",
      "Architecture micro-services, API REST",
      "CI/CD, Docker, monitoring (Sentry, Datadog)",
      "Leadership technique et mentorat",
      "Méthodologies Agile/Scrum",
      "Connaissance du domaine cadastral (atout)"
    ]
  },
  {
    id: 'job-002',
    title: 'Développeur Frontend React',
    department: 'tech',
    contractType: 'CDI',
    location: 'Kinshasa / Remote',
    experience: '3+ ans',
    salary: '1 800 – 3 000 USD/mois',
    status: 'open',
    publishedAt: '2026-03-15',
    description: "Développe et maintient les interfaces utilisateur de la plateforme, en assurant une expérience fluide et responsive sur tous les appareils.",
    missions: [
      "Développer des composants React réutilisables avec TypeScript",
      "Intégrer les maquettes UI/UX avec Tailwind CSS et Shadcn",
      "Optimiser les performances frontend (lazy loading, caching)",
      "Implémenter les fonctionnalités cartographiques (Leaflet)",
      "Écrire des tests unitaires et d'intégration",
      "Participer aux revues de code et à l'amélioration continue"
    ],
    skills: [
      "React 18+, TypeScript, Tailwind CSS",
      "State management (React Query, Zustand)",
      "Tests (Vitest, Testing Library)",
      "Responsive design et accessibilité (WCAG)",
      "Git, CI/CD basics",
      "Leaflet/MapLibre (atout)"
    ]
  },
  {
    id: 'job-003',
    title: 'Développeur Backend / Supabase',
    department: 'tech',
    contractType: 'CDI',
    location: 'Kinshasa / Remote',
    experience: '3+ ans',
    salary: '2 000 – 3 500 USD/mois',
    status: 'open',
    publishedAt: '2026-03-15',
    description: "Conçoit et maintient l'infrastructure backend, les fonctions Edge, les politiques de sécurité RLS et les workflows de données cadastrales.",
    missions: [
      "Concevoir et optimiser le schéma de base de données PostgreSQL",
      "Développer les Edge Functions (Deno/TypeScript)",
      "Implémenter les politiques RLS et la sécurité des données",
      "Intégrer les APIs de paiement (Mobile Money, Stripe)",
      "Mettre en place les pipelines de données et les migrations",
      "Monitorer les performances et optimiser les requêtes"
    ],
    skills: [
      "PostgreSQL avancé (fonctions, triggers, RLS)",
      "Supabase (Auth, Storage, Edge Functions, Realtime)",
      "Deno/TypeScript pour les Edge Functions",
      "APIs de paiement (Stripe, Mobile Money)",
      "Sécurité des données et conformité RGPD",
      "DevOps basics (CI/CD, monitoring)"
    ]
  },
  {
    id: 'job-004',
    title: 'DevOps / SRE',
    department: 'tech',
    contractType: 'CDI',
    location: 'Kinshasa / Remote',
    experience: '3+ ans',
    salary: '2 500 – 4 000 USD/mois',
    status: 'open',
    publishedAt: '2026-03-20',
    description: "Assure la fiabilité, la disponibilité et les performances de la plateforme en production. Gère l'infrastructure cloud et les pipelines de déploiement.",
    missions: [
      "Gérer l'infrastructure cloud et les environnements",
      "Mettre en place et maintenir les pipelines CI/CD",
      "Implémenter le monitoring, l'alerting et l'observabilité",
      "Gérer les backups, la reprise après sinistre",
      "Optimiser les coûts d'infrastructure",
      "Automatiser les tâches opérationnelles récurrentes"
    ],
    skills: [
      "Cloud (AWS/GCP/Vercel), Docker, Kubernetes",
      "CI/CD (GitHub Actions, GitLab CI)",
      "Monitoring (Grafana, Prometheus, Sentry)",
      "Linux administration, scripting (Bash, Python)",
      "Sécurité réseau et infrastructure",
      "Supabase infrastructure (atout)"
    ]
  },
  {
    id: 'job-005',
    title: 'UX/UI Designer',
    department: 'tech',
    contractType: 'CDI',
    location: 'Kinshasa / Remote',
    experience: '2+ ans',
    salary: '1 500 – 2 500 USD/mois',
    status: 'open',
    publishedAt: '2026-03-20',
    description: "Conçoit les interfaces et expériences utilisateur de la plateforme cadastrale, en garantissant une navigation intuitive adaptée aux contextes d'utilisation locaux.",
    missions: [
      "Concevoir les maquettes et prototypes interactifs (Figma)",
      "Mener des recherches utilisateur et tests d'utilisabilité",
      "Créer et maintenir le design system",
      "Collaborer avec les développeurs pour l'implémentation",
      "Optimiser les parcours utilisateur et les taux de conversion",
      "Adapter les interfaces aux contraintes mobiles et réseau"
    ],
    skills: [
      "Figma (expert), prototypage interactif",
      "Design system et composants réutilisables",
      "UX Research, tests utilisateur",
      "Accessibilité (WCAG 2.1)",
      "Connaissance de Tailwind CSS / CSS moderne (atout)",
      "Sensibilité aux contextes africains (mobile-first, low bandwidth)"
    ]
  },
  {
    id: 'job-006',
    title: 'Responsable Cadastre',
    department: 'ops',
    contractType: 'CDI',
    location: 'Kinshasa',
    experience: '5+ ans',
    salary: '2 500 – 4 000 USD/mois',
    status: 'open',
    publishedAt: '2026-03-25',
    description: "Supervise les opérations cadastrales sur la plateforme : validation des contributions, gestion des demandes de titres fonciers, mutations et expertises.",
    missions: [
      "Superviser la file de validation des contributions cadastrales",
      "Gérer les demandes de titres fonciers et mutations",
      "Coordonner avec les services cadastraux officiels",
      "Former et encadrer les agents de validation",
      "Assurer la conformité des données avec la réglementation",
      "Produire les rapports d'activité cadastrale"
    ],
    skills: [
      "Droit foncier congolais et procédures cadastrales",
      "Expérience en administration foncière",
      "Gestion d'équipe et leadership",
      "Maîtrise des outils numériques et SIG",
      "Rigueur et attention au détail",
      "Connaissance du contexte foncier en RDC"
    ]
  },
  {
    id: 'job-007',
    title: 'Agent de Validation',
    department: 'ops',
    contractType: 'CDD (renouvelable)',
    location: 'Kinshasa',
    experience: '2+ ans',
    salary: '800 – 1 500 USD/mois',
    status: 'open',
    publishedAt: '2026-03-25',
    description: "Valide les contributions des utilisateurs, vérifie la conformité des données cadastrales et traite les demandes de services fonciers.",
    missions: [
      "Valider les contributions cadastrales (CCC) soumises",
      "Vérifier la conformité des documents et données parcellaires",
      "Traiter les demandes de titres, mutations et expertises",
      "Détecter et signaler les tentatives de fraude",
      "Communiquer avec les contributeurs pour les corrections",
      "Maintenir la qualité de la base de données cadastrale"
    ],
    skills: [
      "Connaissance des procédures cadastrales",
      "Rigueur et capacité d'analyse documentaire",
      "Maîtrise des outils informatiques",
      "Bonnes capacités de communication",
      "Sens du détail et de la précision",
      "Résistance au stress (volume de dossiers)"
    ]
  },
  {
    id: 'job-008',
    title: 'Analyste Données',
    department: 'ops',
    contractType: 'CDI',
    location: 'Kinshasa / Remote',
    experience: '3+ ans',
    salary: '1 800 – 3 000 USD/mois',
    status: 'open',
    publishedAt: '2026-03-25',
    description: "Analyse les données de la plateforme pour produire des insights opérationnels, optimiser les processus et alimenter les tableaux de bord décisionnels.",
    missions: [
      "Analyser les données cadastrales et financières",
      "Créer et maintenir les tableaux de bord analytics",
      "Produire des rapports hebdomadaires et mensuels",
      "Identifier les tendances et anomalies dans les données",
      "Optimiser les requêtes et la performance des rapports",
      "Collaborer avec les équipes métier pour les KPIs"
    ],
    skills: [
      "SQL avancé, PostgreSQL",
      "Outils de visualisation (Recharts, Tableau, Power BI)",
      "Python/R pour l'analyse de données (atout)",
      "Statistiques et modélisation",
      "Communication des résultats aux non-techniques",
      "Connaissance du domaine foncier (atout)"
    ]
  },
  {
    id: 'job-009',
    title: 'Responsable Partenariats',
    department: 'commercial',
    contractType: 'CDI',
    location: 'Kinshasa',
    experience: '4+ ans',
    salary: '2 000 – 3 500 USD/mois',
    status: 'open',
    publishedAt: '2026-04-01',
    description: "Développe et gère les partenariats stratégiques avec les institutions, administrations et acteurs du secteur foncier pour étendre la portée de la plateforme.",
    missions: [
      "Identifier et prospecter les partenaires potentiels",
      "Négocier et conclure les accords de partenariat",
      "Gérer les relations avec les administrations publiques",
      "Développer le réseau de revendeurs et agents terrain",
      "Organiser des événements et présentations institutionnelles",
      "Suivre les KPIs de développement commercial"
    ],
    skills: [
      "Expérience en développement commercial B2B/B2G",
      "Réseau dans le secteur foncier et immobilier en RDC",
      "Négociation et closing",
      "Communication institutionnelle",
      "Gestion de projet et suivi de pipeline",
      "Maîtrise du français et des langues locales"
    ]
  },
  {
    id: 'job-010',
    title: 'Chargé Marketing Digital',
    department: 'commercial',
    contractType: 'CDI',
    location: 'Kinshasa / Remote',
    experience: '2+ ans',
    salary: '1 200 – 2 000 USD/mois',
    status: 'open',
    publishedAt: '2026-04-01',
    description: "Pilote la stratégie de marketing digital pour accroître la visibilité de la plateforme, acquérir de nouveaux utilisateurs et fidéliser la communauté existante.",
    missions: [
      "Définir et exécuter la stratégie de marketing digital",
      "Gérer les campagnes publicitaires (Google Ads, Facebook, LinkedIn)",
      "Produire du contenu pour le blog, réseaux sociaux et newsletters",
      "Optimiser le SEO et le référencement de la plateforme",
      "Analyser les performances des campagnes et le ROI",
      "Gérer les relations presse et communication externe"
    ],
    skills: [
      "Marketing digital (SEO, SEA, SMO)",
      "Outils d'analytics (Google Analytics, Facebook Insights)",
      "Création de contenu et copywriting",
      "Email marketing et automation",
      "Design basique (Canva, Adobe Suite)",
      "Connaissance du marché africain (atout)"
    ]
  },
  {
    id: 'job-011',
    title: 'Responsable Support Client',
    department: 'support',
    contractType: 'CDI',
    location: 'Kinshasa',
    experience: '3+ ans',
    salary: '1 500 – 2 500 USD/mois',
    status: 'open',
    publishedAt: '2026-04-01',
    description: "Supervise l'équipe de support client, garantit la satisfaction des utilisateurs et met en place les processus d'assistance et de résolution des problèmes.",
    missions: [
      "Superviser l'équipe de support N1 et N2",
      "Définir les SLA et processus de support",
      "Gérer l'escalade des problèmes complexes",
      "Former les agents de support aux nouvelles fonctionnalités",
      "Analyser les tickets pour identifier les améliorations produit",
      "Produire les rapports de satisfaction client"
    ],
    skills: [
      "Expérience en gestion de support client",
      "Outils de ticketing (Zendesk, Freshdesk, Intercom)",
      "Gestion d'équipe et coaching",
      "Communication empathique et résolution de conflits",
      "Analyse de données de satisfaction",
      "Connaissance technique de base (plateforme web)"
    ]
  },
  {
    id: 'job-012',
    title: 'Formateur Utilisateurs',
    department: 'support',
    contractType: 'CDD (renouvelable)',
    location: 'Kinshasa + déplacements',
    experience: '2+ ans',
    salary: '1 000 – 1 800 USD/mois',
    status: 'open',
    publishedAt: '2026-04-01',
    description: "Forme les utilisateurs et agents terrain à l'utilisation de la plateforme, crée les supports de formation et assure l'accompagnement au changement.",
    missions: [
      "Concevoir et animer des sessions de formation (présentiel et en ligne)",
      "Créer les guides utilisateur, tutoriels vidéo et FAQ",
      "Former les agents terrain et revendeurs à l'utilisation de la plateforme",
      "Assurer le support de proximité lors des déploiements",
      "Recueillir les retours terrain pour améliorer le produit",
      "Organiser des webinaires et sessions Q&A"
    ],
    skills: [
      "Expérience en formation et pédagogie",
      "Création de contenu pédagogique (vidéo, PDF)",
      "Aisance relationnelle et prise de parole en public",
      "Maîtrise des outils numériques",
      "Adaptabilité aux publics variés (terrain, bureau)",
      "Français + langues locales (lingala, swahili, etc.)"
    ]
  }
];

export const leaveTypes: Record<string, { label: string; color: string }> = {
  annual: { label: 'Congé annuel', color: 'hsl(var(--primary))' },
  sick: { label: 'Maladie', color: 'hsl(var(--destructive))' },
  maternity: { label: 'Maternité/Paternité', color: 'hsl(var(--chart-3))' },
  unpaid: { label: 'Sans solde', color: 'hsl(var(--muted-foreground))' },
  other: { label: 'Autre', color: 'hsl(var(--chart-5))' },
};
