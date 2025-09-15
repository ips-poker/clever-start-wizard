import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Wand2, 
  Target, 
  TrendingUp, 
  Eye, 
  CheckCircle, 
  AlertTriangle,
  Lightbulb,
  BarChart3
} from 'lucide-react';

export function AutoSEOGenerator() {
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const [formData, setFormData] = useState({
    pageSlug: 'home',
    url: window.location.origin,
    content: '',
    keywords: 'покер клуб москва, турниры по покеру, покерный клуб премиум',
    competitors: 'pokerdom.ru, pokerstars.ru, partypoker.ru'
  });

  const { toast } = useToast();

  const analyzeWithAI = async () => {
    try {
      setAnalyzing(true);
      
      const { data, error } = await supabase.functions.invoke('seo-analyzer', {
        body: {
          url: formData.url,
          content: formData.content,
          pageSlug: formData.pageSlug,
          keywords: formData.keywords,
          competitors: formData.competitors
        }
      });

      if (error) throw error;

      setAnalysis(data);
      toast({
        title: "Анализ завершен",
        description: "AI провел глубокий анализ SEO оптимизации",
      });
    } catch (error: any) {
      console.error('Error analyzing with AI:', error);
      toast({
        title: "Ошибка анализа",
        description: error.message || "Не удалось провести AI анализ",
        variant: "destructive",
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const applySEORecommendations = async () => {
    if (!analysis?.recommendations) return;

    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('cms_seo')
        .upsert({
          page_slug: formData.pageSlug,
          meta_title: analysis.recommendations.title,
          meta_description: analysis.recommendations.description,
          meta_keywords: analysis.recommendations.keywords,
          canonical_url: formData.url,
          robots_meta: 'index, follow',
          schema_markup: analysis.recommendations.schema
        });

      if (error) throw error;

      toast({
        title: "SEO данные обновлены",
        description: "Рекомендации AI успешно применены",
      });
    } catch (error: any) {
      console.error('Error applying recommendations:', error);
      toast({
        title: "Ошибка применения",
        description: error.message || "Не удалось применить рекомендации",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateContent = async () => {
    // Автоматическое извлечение контента со страницы
    const pageContent = document.body.innerText.slice(0, 2000); // Первые 2000 символов
    setFormData(prev => ({ ...prev, content: pageContent }));
    
    toast({
      title: "Контент извлечен",
      description: "Текст страницы готов для анализа",
    });
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBadge = (score: number) => {
    if (score >= 80) return 'default';
    if (score >= 60) return 'secondary';
    return 'destructive';
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wand2 className="w-5 h-5" />
            AI SEO Генератор для Яндекса
          </CardTitle>
          <CardDescription>
            Автоматический анализ и оптимизация SEO с помощью Perplexity AI
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="pageSlug">Страница</Label>
              <Input
                id="pageSlug"
                value={formData.pageSlug}
                onChange={(e) => setFormData(prev => ({ ...prev, pageSlug: e.target.value }))}
                placeholder="home"
              />
            </div>
            <div>
              <Label htmlFor="url">URL</Label>
              <Input
                id="url"
                value={formData.url}
                onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                placeholder="https://example.com"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="keywords">Ключевые слова</Label>
            <Input
              id="keywords"
              value={formData.keywords}
              onChange={(e) => setFormData(prev => ({ ...prev, keywords: e.target.value }))}
              placeholder="покер клуб, турниры, рейтинг"
            />
          </div>

          <div>
            <Label htmlFor="competitors">Конкуренты</Label>
            <Input
              id="competitors"
              value={formData.competitors}
              onChange={(e) => setFormData(prev => ({ ...prev, competitors: e.target.value }))}
              placeholder="competitor1.ru, competitor2.ru"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <Label htmlFor="content">Контент страницы</Label>
              <Button variant="outline" size="sm" onClick={generateContent}>
                <Eye className="w-4 h-4 mr-2" />
                Извлечь с страницы
              </Button>
            </div>
            <Textarea
              id="content"
              value={formData.content}
              onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
              placeholder="Введите или извлеките контент страницы..."
              rows={4}
            />
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={analyzeWithAI} 
              disabled={analyzing || !formData.url}
              className="flex items-center gap-2"
            >
              {analyzing ? (
                <LoadingSpinner size="sm" />
              ) : (
                <Target className="w-4 h-4" />
              )}
              {analyzing ? 'Анализирую...' : 'Анализировать с AI'}
            </Button>

            {analysis && (
              <Button 
                onClick={applySEORecommendations}
                disabled={loading}
                variant="outline"
                className="flex items-center gap-2"
              >
                {loading ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
                Применить рекомендации
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {analysis && (
        <div className="space-y-4">
          {/* SEO Score */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold mb-2">SEO Оценка</h3>
                  <p className="text-muted-foreground">
                    Общая оценка оптимизации для Яндекса
                  </p>
                </div>
                <div className="text-center">
                  <div className={`text-4xl font-bold ${getScoreColor(analysis.score)}`}>
                    {analysis.score}
                  </div>
                  <Badge variant={getScoreBadge(analysis.score)}>
                    {analysis.score >= 80 ? 'Отлично' : analysis.score >= 60 ? 'Хорошо' : 'Нужна работа'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recommendations */}
          {analysis.recommendations && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="w-5 h-5" />
                  AI Рекомендации
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="font-semibold">Рекомендуемый Title:</Label>
                  <div className="p-3 bg-muted rounded-lg mt-1">
                    {analysis.recommendations.title}
                  </div>
                </div>

                <div>
                  <Label className="font-semibold">Рекомендуемое Description:</Label>
                  <div className="p-3 bg-muted rounded-lg mt-1">
                    {analysis.recommendations.description}
                  </div>
                </div>

                <div>
                  <Label className="font-semibold">H1 заголовок:</Label>
                  <div className="p-3 bg-muted rounded-lg mt-1">
                    {analysis.recommendations.h1}
                  </div>
                </div>

                <div>
                  <Label className="font-semibold">Ключевые слова:</Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {analysis.recommendations.keywords?.split(',').map((keyword: string, index: number) => (
                      <Badge key={index} variant="secondary">
                        {keyword.trim()}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Analysis Details */}
          {analysis.analysis && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Детальный анализ
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose max-w-none">
                  <pre className="whitespace-pre-wrap text-sm bg-muted p-4 rounded-lg overflow-auto">
                    {typeof analysis.analysis === 'string' 
                      ? analysis.analysis 
                      : JSON.stringify(analysis.analysis, null, 2)
                    }
                  </pre>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Issues and Suggestions */}
          {(analysis.analysis?.issues || analysis.analysis?.suggestions) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {analysis.analysis.issues && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-yellow-600">
                      <AlertTriangle className="w-5 h-5" />
                      Найденные проблемы
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {analysis.analysis.issues.map((issue: string, index: number) => (
                        <li key={index} className="flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                          <span className="text-sm">{issue}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {analysis.analysis.suggestions && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-green-600">
                      <TrendingUp className="w-5 h-5" />
                      Рекомендации
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {analysis.analysis.suggestions.map((suggestion: string, index: number) => (
                        <li key={index} className="flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span className="text-sm">{suggestion}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}