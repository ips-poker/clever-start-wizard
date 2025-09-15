import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Share, MessageSquare, Wand2, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface SEOPreviewProps {
  metaTitle: string;
  metaDescription: string;
  canonicalUrl: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
}

export function SEOPreview({
  metaTitle,
  metaDescription,
  canonicalUrl,
  ogTitle,
  ogDescription,
  ogImage,
}: SEOPreviewProps) {
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [aiRecommendations, setAiRecommendations] = useState<any>(null);
  const { toast } = useToast();

  const analyzePreviewWithAI = async () => {
    try {
      setAiAnalyzing(true);
      
      const seoData = {
        metaTitle,
        metaDescription,
        canonicalUrl,
        ogTitle,
        ogDescription,
        ogImage
      };
      
      const { data, error } = await supabase.functions.invoke('seo-analyzer', {
        body: {
          pageSlug: 'preview_analysis',
          url: canonicalUrl || window.location.origin,
          content: JSON.stringify(seoData),
          keywords: 'meta tags, open graph, seo preview',
          competitors: ''
        }
      });

      if (error) throw error;

      setAiRecommendations(data);
      toast({
        title: "AI анализ завершен",
        description: "Получены рекомендации по улучшению SEO превью",
      });
    } catch (error: any) {
      console.error('Error analyzing preview:', error);
      toast({
        title: "Ошибка AI анализа",
        description: error.message || "Не удалось провести анализ превью",
        variant: "destructive",
      });
    } finally {
      setAiAnalyzing(false);
    }
  };

  const displayUrl = canonicalUrl || "https://example.com";
  const domain = new URL(displayUrl).hostname;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold mb-2">Предпросмотр в поисковой выдаче</h3>
          <p className="text-sm text-muted-foreground">
            Посмотрите, как ваша страница будет выглядеть в различных контекстах
          </p>
        </div>
        <Button 
          onClick={analyzePreviewWithAI} 
          disabled={aiAnalyzing}
          variant="outline" 
          className="flex items-center gap-2"
        >
          {aiAnalyzing ? (
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : (
            <Wand2 className="w-4 h-4" />
          )}
          {aiAnalyzing ? 'Анализирую...' : 'Анализ превью с AI'}
        </Button>
      </div>

      <Tabs defaultValue="google" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="google" className="flex items-center gap-2">
            <Search className="w-4 h-4" />
            Google
          </TabsTrigger>
          <TabsTrigger value="yandex" className="flex items-center gap-2">
            <Search className="w-4 h-4" />
            Yandex
          </TabsTrigger>
          <TabsTrigger value="facebook" className="flex items-center gap-2">
            <Share className="w-4 h-4" />
            Facebook
          </TabsTrigger>
          <TabsTrigger value="twitter" className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Twitter
          </TabsTrigger>
        </TabsList>

        {/* Google Preview */}
        <TabsContent value="google">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Результат в Google</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 p-4 bg-white border rounded-lg">
                <div className="flex items-center gap-2 text-xs text-green-700">
                  <div className="w-4 h-4 bg-gray-300 rounded-full"></div>
                  <span>{domain}</span>
                  <span>›</span>
                  <span className="text-gray-600">страница</span>
                </div>
                <div>
                  <h3 className="text-xl text-blue-600 hover:underline cursor-pointer">
                    {metaTitle || "Заголовок страницы (Title)"}
                  </h3>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {metaDescription || "Описание страницы будет отображаться здесь. Рекомендуемая длина до 160 символов для лучшего отображения в поисковой выдаче."}
                </p>
                
                {/* Title length indicator */}
                <div className="flex items-center gap-2 mt-3 pt-3 border-t">
                  <Badge variant={metaTitle.length <= 60 ? "default" : "destructive"} className="text-xs">
                    Title: {metaTitle.length}/60
                  </Badge>
                  <Badge variant={metaDescription.length <= 160 ? "default" : "destructive"} className="text-xs">
                    Description: {metaDescription.length}/160
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Yandex Preview */}
        <TabsContent value="yandex">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Результат в Яндекс</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 p-4 bg-white border rounded-lg">
                <div className="text-xs text-green-600">
                  {displayUrl}
                </div>
                <div>
                  <h3 className="text-lg text-blue-600 hover:underline cursor-pointer font-normal">
                    {metaTitle || "Заголовок страницы (Title)"}
                  </h3>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">
                  {metaDescription || "Описание страницы будет отображаться здесь в результатах поиска Яндекс."}
                </p>
                
                <div className="flex items-center gap-2 mt-3 pt-3 border-t">
                  <Badge variant={metaTitle.length <= 60 ? "default" : "destructive"} className="text-xs">
                    Заголовок: {metaTitle.length}/60
                  </Badge>
                  <Badge variant={metaDescription.length <= 160 ? "default" : "destructive"} className="text-xs">
                    Описание: {metaDescription.length}/160
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Facebook Preview */}
        <TabsContent value="facebook">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Предпросмотр в Facebook</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-100 p-4 rounded-lg">
                <div className="bg-white border rounded-lg overflow-hidden shadow-sm">
                  {ogImage && (
                    <div className="aspect-[1.91/1] bg-gray-200 flex items-center justify-center">
                      <img 
                        src={ogImage} 
                        alt="Open Graph preview" 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.parentElement!.innerHTML = '<div class="flex items-center justify-center h-full text-gray-400">Изображение не найдено</div>';
                        }}
                      />
                    </div>
                  )}
                  <div className="p-3 space-y-1">
                    <div className="text-xs text-gray-500 uppercase">
                      {domain}
                    </div>
                    <h3 className="font-semibold text-gray-900 leading-tight">
                      {ogTitle || metaTitle || "Заголовок для социальных сетей"}
                    </h3>
                    <p className="text-sm text-gray-600 leading-tight">
                      {ogDescription || metaDescription || "Описание для социальных сетей"}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 mt-3">
                  <Badge variant={(ogTitle || metaTitle).length <= 65 ? "default" : "destructive"} className="text-xs">
                    OG Title: {(ogTitle || metaTitle).length}/65
                  </Badge>
                  <Badge variant={(ogDescription || metaDescription).length <= 200 ? "default" : "destructive"} className="text-xs">
                    OG Description: {(ogDescription || metaDescription).length}/200
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Twitter Preview */}
        <TabsContent value="twitter">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Предпросмотр в Twitter</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  {ogImage && (
                    <div className="aspect-[2/1] bg-gray-200 flex items-center justify-center">
                      <img 
                        src={ogImage} 
                        alt="Twitter card preview" 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.parentElement!.innerHTML = '<div class="flex items-center justify-center h-full text-gray-400">Изображение не найдено</div>';
                        }}
                      />
                    </div>
                  )}
                  <div className="p-3 space-y-1">
                    <h3 className="font-semibold text-gray-900 leading-tight text-sm">
                      {ogTitle || metaTitle || "Заголовок для Twitter"}
                    </h3>
                    <p className="text-sm text-gray-600 leading-tight">
                      {ogDescription || metaDescription || "Описание для Twitter карточки"}
                    </p>
                    <div className="text-xs text-gray-500">
                      {domain}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 mt-3">
                  <Badge variant={(ogTitle || metaTitle).length <= 70 ? "default" : "destructive"} className="text-xs">
                    Twitter Title: {(ogTitle || metaTitle).length}/70
                  </Badge>
                  <Badge variant={(ogDescription || metaDescription).length <= 200 ? "default" : "destructive"} className="text-xs">
                    Twitter Description: {(ogDescription || metaDescription).length}/200
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* AI Recommendations */}
      {aiRecommendations && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wand2 className="w-5 h-5" />
              AI Рекомендации по превью
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {aiRecommendations.analysis && (
                <div>
                  <h4 className="font-semibold mb-2">Анализ превью:</h4>
                  <div className="p-3 bg-muted rounded-lg">
                    <pre className="whitespace-pre-wrap text-sm">
                      {typeof aiRecommendations.analysis === 'string' 
                        ? aiRecommendations.analysis 
                        : JSON.stringify(aiRecommendations.analysis, null, 2)
                      }
                    </pre>
                  </div>
                </div>
              )}
              
              {aiRecommendations.recommendations && (
                <div>
                  <h4 className="font-semibold mb-2">Рекомендации по улучшению:</h4>
                  <div className="grid grid-cols-1 gap-3">
                    {Object.entries(aiRecommendations.recommendations).map(([key, value]: [string, any]) => (
                      <div key={key} className="p-3 border rounded-lg">
                        <h5 className="font-medium capitalize">{key.replace('_', ' ')}:</h5>
                        <p className="text-sm text-muted-foreground mt-1">{value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}