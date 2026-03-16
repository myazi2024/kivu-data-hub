import { useParams, Link, useNavigate } from 'react-router-dom';
import { useArticleBySlug } from '@/hooks/useArticles';
import Navigation from '@/components/ui/navigation';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Calendar, Eye, Share2, Bookmark } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Helmet } from 'react-helmet';
import { useToast } from '@/hooks/use-toast';
import { useEffect, useState } from 'react';
import DOMPurify from 'dompurify';

const ArticleDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { article, loading } = useArticleBySlug(slug || '');
  const { toast } = useToast();
  const [readProgress, setReadProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight - windowHeight;
      const scrollTop = window.scrollY;
      const progress = (scrollTop / documentHeight) * 100;
      setReadProgress(Math.min(100, Math.max(0, progress)));
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleShare = async () => {
    if (navigator.share && article) {
      try {
        await navigator.share({
          title: article.title,
          text: article.summary,
          url: window.location.href,
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      // Fallback: copier le lien
      navigator.clipboard.writeText(window.location.href);
      toast({
        title: "Lien copié",
        description: "Le lien de l'article a été copié dans le presse-papier",
      });
    }
  };

  if (loading) {
    return (
      <>
        <Navigation />
        <div className="container max-w-4xl mx-auto px-4 py-8">
          <Skeleton className="h-8 w-32 mb-6" />
          <Skeleton className="h-12 w-full mb-4" />
          <Skeleton className="h-6 w-3/4 mb-8" />
          <div className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
        <Footer />
      </>
    );
  }

  if (!article) {
    return (
      <>
        <Navigation />
        <div className="container max-w-4xl mx-auto px-4 py-12 text-center">
          <h1 className="text-2xl font-bold mb-4">Article non trouvé</h1>
          <p className="text-muted-foreground mb-6">
            L'article que vous recherchez n'existe pas ou n'est plus disponible.
          </p>
          <Button onClick={() => navigate('/articles')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour aux articles
          </Button>
        </div>
        <Footer />
      </>
    );
  }

  // Parser le contenu markdown en HTML simple
  // SECURITY: Sanitize HTML to prevent XSS attacks
  const formatContent = (content: string) => {
    const html = content
      .split('\n')
      .map(line => {
        // Titres
        if (line.startsWith('### ')) return `<h3 class="text-xl font-semibold mt-6 mb-3">${line.slice(4)}</h3>`;
        if (line.startsWith('## ')) return `<h2 class="text-2xl font-bold mt-8 mb-4">${line.slice(3)}</h2>`;
        if (line.startsWith('# ')) return `<h1 class="text-3xl font-bold mt-8 mb-4">${line.slice(2)}</h1>`;
        // Listes
        if (line.startsWith('- ')) return `<li class="ml-6 mb-2">${line.slice(2)}</li>`;
        if (/^\d+\./.test(line)) return `<li class="ml-6 mb-2">${line.replace(/^\d+\.\s*/, '')}</li>`;
        // Gras
        line = line.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>');
        // Paragraphes
        return line.trim() ? `<p class="mb-4 leading-relaxed">${line}</p>` : '';
      })
      .join('');

    // Sanitize HTML to prevent XSS attacks from malicious article content
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: ['h1', 'h2', 'h3', 'p', 'strong', 'em', 'li', 'ul', 'ol', 'br'],
      ALLOWED_ATTR: ['class'],
      KEEP_CONTENT: true
    });
  };

  return (
    <>
      <Helmet>
        <title>{article.title} - BIC</title>
        <meta name="description" content={article.summary} />
        <meta property="og:title" content={article.title} />
        <meta property="og:description" content={article.summary} />
        <meta property="og:type" content="article" />
        {article.cover_image_url && <meta property="og:image" content={article.cover_image_url} />}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={article.title} />
        <meta name="twitter:description" content={article.summary} />
        {article.cover_image_url && <meta name="twitter:image" content={article.cover_image_url} />}
        <meta name="article:published_time" content={article.published_at} />
        {article.author_name && <meta name="article:author" content={article.author_name} />}
        {article.tags && <meta name="article:tag" content={article.tags.join(', ')} />}
      </Helmet>

      {/* Barre de progression */}
      <div 
        className="fixed top-0 left-0 h-1 bg-primary z-50 transition-all duration-100"
        style={{ width: `${readProgress}%` }}
      />

      <div className="min-h-dvh flex flex-col">
        <Navigation />
        
        <main className="flex-1">
          <article className="container max-w-4xl mx-auto px-4 py-8">
            {/* Bouton retour */}
            <Button
              variant="ghost"
              onClick={() => navigate('/articles')}
              className="mb-6"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour aux articles
            </Button>

            {/* Image de couverture */}
            {article.cover_image_url && (
              <div className="w-full h-64 md:h-96 rounded-xl overflow-hidden mb-6">
                <img
                  src={article.cover_image_url}
                  alt={article.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* En-tête */}
            <header className="mb-8">
              <div className="flex items-center gap-2 mb-4 flex-wrap">
                {article.article_themes && (
                  <Badge variant="default">
                    {article.article_themes.short_name}
                  </Badge>
                )}
                {article.tags?.map((tag) => (
                  <Badge key={tag} variant="outline">
                    {tag}
                  </Badge>
                ))}
              </div>

              <h1 className="text-3xl md:text-4xl font-bold mb-4 leading-tight">
                {article.title}
              </h1>

              <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
                {article.summary}
              </p>

              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  {article.author_name && (
                    <span className="font-medium">{article.author_name}</span>
                  )}
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <time dateTime={article.published_at}>
                      {format(new Date(article.published_at), 'd MMMM yyyy', { locale: fr })}
                    </time>
                  </div>
                  <div className="flex items-center gap-1">
                    <Eye className="h-4 w-4" />
                    <span>{article.view_count} vues</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleShare}
                  >
                    <Share2 className="h-4 w-4 mr-2" />
                    Partager
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                  >
                    <Bookmark className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </header>

            <Separator className="my-8" />

            {/* Contenu */}
            <div 
              className="prose prose-lg max-w-none"
              dangerouslySetInnerHTML={{ __html: formatContent(article.content) }}
            />

            <Separator className="my-8" />

            {/* Footer article */}
            <footer className="flex items-center justify-between py-6">
              <Button
                variant="outline"
                onClick={() => navigate('/articles')}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Plus d'articles
              </Button>
              <Button
                variant="default"
                onClick={handleShare}
              >
                <Share2 className="mr-2 h-4 w-4" />
                Partager cet article
              </Button>
            </footer>
          </article>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default ArticleDetail;
