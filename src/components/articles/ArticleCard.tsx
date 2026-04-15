import { Article } from '@/hooks/useArticles';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Eye, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { useAppAppearance } from '@/hooks/useAppAppearance';

interface ArticleCardProps {
  article: Article;
}

const ArticleCard = ({ article }: ArticleCardProps) => {
  const { config } = useAppAppearance();

  return (
    <Link to={`/articles/${article.slug}`}>
      <Card className="h-full hover:shadow-lg transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] cursor-pointer">
        {article.cover_image_url && (
          <div className="w-full h-48 overflow-hidden rounded-t-lg">
            <img
              src={article.cover_image_url}
              alt={article.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            {article.article_themes && (
              <Badge variant="secondary" className="text-xs">
                {article.article_themes.short_name}
              </Badge>
            )}
            {article.tags?.slice(0, 2).map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
          <CardTitle className="text-lg line-clamp-2 leading-tight">
            {article.title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <CardDescription className="line-clamp-3 text-sm leading-relaxed">
            {article.summary}
          </CardDescription>
        </CardContent>
        <CardFooter className="flex items-center justify-between pt-0 text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>{format(new Date(article.published_at), 'd MMM yyyy', { locale: fr })}</span>
            </div>
            <div className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              <span>{article.view_count}</span>
              {config.logo_url && (
                <img 
                  src={config.logo_url} 
                  alt="" 
                  className="h-3 w-auto object-contain opacity-70 ml-1"
                />
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 text-primary font-medium">
            <span>Lire</span>
            <ArrowRight className="h-4 w-4" />
          </div>
        </CardFooter>
      </Card>
    </Link>
  );
};

export default ArticleCard;
