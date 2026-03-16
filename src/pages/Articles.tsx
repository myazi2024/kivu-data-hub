import { useState } from 'react';
import Navigation from '@/components/ui/navigation';
import Footer from '@/components/Footer';
import ThemeMenu from '@/components/articles/ThemeMenu';
import ArticleList from '@/components/articles/ArticleList';
import { useArticleThemes, useArticles } from '@/hooks/useArticles';
import { Helmet } from 'react-helmet';

const Articles = () => {
  const [selectedThemeId, setSelectedThemeId] = useState<string | undefined>();
  const { themes, loading: themesLoading } = useArticleThemes();
  const { articles, loading: articlesLoading } = useArticles(selectedThemeId);

  const selectedTheme = themes.find(t => t.id === selectedThemeId);
  const pageTitle = selectedTheme 
    ? `Articles ${selectedTheme.name} - BIC`
    : 'Articles Immobiliers - BIC';
  const pageDescription = selectedTheme?.description || 
    'Découvrez nos analyses, guides et actualités sur le marché immobilier de la RDC';

  return (
    <>
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={pageDescription} />
      </Helmet>

      <div className="min-h-dvh flex flex-col">
        <Navigation />
        
        <main className="flex-1">
          {/* Header */}
          <section className="bg-gradient-to-b from-primary/5 to-background py-12 px-4">
            <div className="container max-w-7xl mx-auto">
              <h1 className="text-3xl md:text-4xl font-bold mb-3">
                {selectedTheme ? selectedTheme.name : 'Articles Immobiliers'}
              </h1>
              <p className="text-muted-foreground text-lg max-w-2xl">
                {selectedTheme 
                  ? selectedTheme.description
                  : 'Analyses, guides pratiques et actualités du marché immobilier congolais'}
              </p>
            </div>
          </section>

          {/* Menu thématique */}
          {!themesLoading && (
            <ThemeMenu
              themes={themes}
              activeThemeId={selectedThemeId}
              onThemeSelect={setSelectedThemeId}
            />
          )}

          {/* Liste des articles */}
          <section className="py-8 px-4">
            <div className="container max-w-7xl mx-auto">
              <ArticleList articles={articles} loading={articlesLoading} />
            </div>
          </section>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default Articles;
