-- Créer la table des thématiques d'articles
CREATE TABLE public.article_themes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  short_name TEXT NOT NULL,
  description TEXT,
  icon_name TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Créer la table des articles
CREATE TABLE public.articles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  theme_id UUID NOT NULL REFERENCES public.article_themes(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  summary TEXT NOT NULL,
  content TEXT NOT NULL,
  cover_image_url TEXT,
  author_id UUID REFERENCES auth.users(id),
  author_name TEXT,
  tags TEXT[] DEFAULT '{}',
  view_count INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Créer la table des favoris d'articles
CREATE TABLE public.article_favorites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  article_id UUID NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, article_id)
);

-- Activer RLS
ALTER TABLE public.article_themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.article_favorites ENABLE ROW LEVEL SECURITY;

-- Politiques pour article_themes
CREATE POLICY "Themes are viewable by everyone"
  ON public.article_themes FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage themes"
  ON public.article_themes FOR ALL
  USING (get_current_user_role() = 'admin');

-- Politiques pour articles
CREATE POLICY "Published articles are viewable by everyone"
  ON public.articles FOR SELECT
  USING (is_published = true);

CREATE POLICY "Authors can view their own articles"
  ON public.articles FOR SELECT
  USING (auth.uid() = author_id);

CREATE POLICY "Admins can manage all articles"
  ON public.articles FOR ALL
  USING (get_current_user_role() = 'admin');

CREATE POLICY "Authors can create articles"
  ON public.articles FOR INSERT
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authors can update their own articles"
  ON public.articles FOR UPDATE
  USING (auth.uid() = author_id);

-- Politiques pour article_favorites
CREATE POLICY "Users can view their own favorites"
  ON public.article_favorites FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can add favorites"
  ON public.article_favorites FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove favorites"
  ON public.article_favorites FOR DELETE
  USING (auth.uid() = user_id);

-- Créer des index pour les performances
CREATE INDEX idx_articles_theme_id ON public.articles(theme_id);
CREATE INDEX idx_articles_slug ON public.articles(slug);
CREATE INDEX idx_articles_published ON public.articles(is_published, published_at DESC);
CREATE INDEX idx_article_favorites_user_id ON public.article_favorites(user_id);
CREATE INDEX idx_article_favorites_article_id ON public.article_favorites(article_id);

-- Trigger pour updated_at
CREATE TRIGGER update_article_themes_updated_at
  BEFORE UPDATE ON public.article_themes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_articles_updated_at
  BEFORE UPDATE ON public.articles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insérer les thématiques
INSERT INTO public.article_themes (name, short_name, description, icon_name, display_order) VALUES
  ('Urbanisme & Aménagement', 'Urbanisme', 'Développement urbain, planification territoriale et infrastructures', 'Building2', 1),
  ('Marché Résidentiel', 'Résidentiel', 'Logements, appartements et tendances du marché résidentiel', 'Home', 2),
  ('Immobilier Commercial', 'Commercial', 'Bureaux, commerces et espaces professionnels', 'Store', 3),
  ('Investissement & Finance', 'Finance', 'Stratégies d''investissement et analyses financières', 'TrendingUp', 4),
  ('Données & Analyses', 'Données', 'Statistiques, études de marché et rapports détaillés', 'BarChart3', 5),
  ('Juridique & Réglementation', 'Juridique', 'Lois, règlements et aspects légaux de l''immobilier', 'Scale', 6),
  ('Innovation & Tech', 'Tech', 'Nouvelles technologies et innovations du secteur', 'Lightbulb', 7),
  ('Durabilité & Environnement', 'Environnement', 'Construction durable et impact environnemental', 'Leaf', 8),
  ('Actualités DRC', 'Actualités', 'Nouvelles et événements du marché congolais', 'Newspaper', 9),
  ('Conseils & Guides', 'Guides', 'Guides pratiques pour acheteurs et investisseurs', 'BookOpen', 10);

-- Insérer des articles d'exemple pour chaque thématique
INSERT INTO public.articles (theme_id, title, slug, summary, content, author_name, tags, is_published, published_at) 
SELECT 
  t.id,
  'L''avenir de ' || t.name || ' à Goma',
  'avenir-' || LOWER(REPLACE(t.short_name, ' ', '-')) || '-goma',
  'Une analyse approfondie des tendances et perspectives dans le domaine de ' || LOWER(t.name) || ' dans la région de Goma et du Nord-Kivu.',
  E'# Introduction\n\nLe secteur de ' || LOWER(t.name) || ' connaît une transformation majeure dans la région de Goma. Cette évolution s''inscrit dans un contexte de développement économique accéléré et d''urbanisation croissante.\n\n## Contexte actuel\n\nLa ville de Goma, capitale du Nord-Kivu, se positionne comme un hub économique majeur de l''Est de la RDC. Le secteur de ' || LOWER(t.name) || ' joue un rôle crucial dans cette dynamique de croissance.\n\n### Points clés\n\n1. **Croissance démographique** : La population de Goma augmente de 5% par an\n2. **Développement économique** : Multiplication des investissements privés et publics\n3. **Infrastructure** : Amélioration progressive des équipements urbains\n4. **Opportunités** : Émergence de nouveaux quartiers et projets d''envergure\n\n## Tendances observées\n\nPlusieurs tendances majeures se dessinent :\n\n- **Modernisation** : Adoption de nouvelles pratiques et standards internationaux\n- **Professionnalisation** : Montée en compétence des acteurs locaux\n- **Innovation** : Intégration des technologies digitales\n- **Durabilité** : Prise en compte croissante des enjeux environnementaux\n\n## Perspectives d''avenir\n\nLes experts s''accordent sur un potentiel de développement significatif dans les 5 prochaines années. Les facteurs favorables incluent la stabilité économique relative, l''afflux d''investissements et la jeunesse de la population.\n\n### Recommandations\n\nPour les acteurs du secteur :\n- Se former aux meilleures pratiques internationales\n- Investir dans la technologie et l''innovation\n- Développer des partenariats stratégiques\n- Anticiper les évolutions réglementaires\n\n## Conclusion\n\nLe secteur de ' || LOWER(t.name) || ' à Goma offre des opportunités exceptionnelles pour les investisseurs et professionnels visionnaires. Une approche stratégique et informée sera déterminante pour capitaliser sur cette dynamique positive.',
  'BIC Research Team',
  ARRAY['analyse', 'goma', LOWER(t.short_name)],
  true,
  now() - (RANDOM() * INTERVAL '30 days')
FROM public.article_themes t;

INSERT INTO public.articles (theme_id, title, slug, summary, content, author_name, tags, is_published, published_at)
SELECT 
  t.id,
  'Top 5 des erreurs à éviter en ' || t.name,
  'erreurs-' || LOWER(REPLACE(t.short_name, ' ', '-')),
  'Les pièges courants à éviter dans le domaine de ' || LOWER(t.name) || ' et comment s''en prémunir efficacement.',
  E'# Les erreurs courantes en ' || t.name || '\n\nDans le domaine de ' || LOWER(t.name) || ', certaines erreurs reviennent fréquemment. Voici comment les identifier et les éviter.\n\n## 1. Manque de recherche préalable\n\nL''erreur la plus fréquente est de se lancer sans une étude approfondie du marché. Il est crucial de :\n- Analyser les tendances actuelles\n- Consulter des experts du domaine\n- Étudier les cas similaires\n- Évaluer les risques potentiels\n\n## 2. Sous-estimation des coûts\n\nBeaucoup sous-estiment les coûts réels associés aux projets en ' || LOWER(t.name) || '. Prévoyez toujours une marge de sécurité de 15-20%.\n\n## 3. Négligence des aspects légaux\n\nLes aspects juridiques et réglementaires sont souvent négligés, ce qui peut entraîner des complications majeures. Consultez toujours un professionnel qualifié.\n\n## 4. Mauvais timing\n\nLe timing est crucial. Une mauvaise évaluation du moment opportun peut compromettre la réussite d''un projet.\n\n## 5. Absence de plan B\n\nNe pas prévoir d''alternative en cas de difficulté est une erreur stratégique majeure.\n\n## Conclusion\n\nÉviter ces erreurs courantes vous permettra d''optimiser vos chances de succès dans le domaine de ' || LOWER(t.name) || '.',
  'Expert BIC',
  ARRAY['conseil', 'guide', LOWER(t.short_name)],
  true,
  now() - (RANDOM() * INTERVAL '20 days')
FROM public.article_themes t;