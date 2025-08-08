import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  Code, 
  Copy, 
  Save, 
  Eye, 
  Download,
  Building2,
  Calendar,
  MapPin,
  Star,
  Users,
  Trophy,
  Clock
} from "lucide-react";

interface SchemaTemplate {
  id: string;
  name: string;
  type: string;
  icon: any;
  description: string;
  template: object;
}

export function SchemaMarkupGenerator() {
  const [selectedSchema, setSelectedSchema] = useState<string>("");
  const [schemaData, setSchemaData] = useState<any>({});
  const [generatedSchema, setGeneratedSchema] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const schemaTemplates: SchemaTemplate[] = [
    {
      id: "organization",
      name: "Организация",
      type: "Organization", 
      icon: Building2,
      description: "Информация о вашей организации или покерном клубе",
      template: {
        "@context": "https://schema.org",
        "@type": "Organization",
        "name": "",
        "url": "",
        "logo": "",
        "description": "",
        "address": {
          "@type": "PostalAddress",
          "streetAddress": "",
          "addressLocality": "",
          "postalCode": "",
          "addressCountry": ""
        },
        "contactPoint": {
          "@type": "ContactPoint",
          "telephone": "",
          "contactType": "customer service"
        },
        "sameAs": []
      }
    },
    {
      id: "event",
      name: "Покерный турнир",
      type: "Event",
      icon: Trophy,
      description: "Структурированные данные для покерных турниров",
      template: {
        "@context": "https://schema.org",
        "@type": "SportsEvent",
        "name": "",
        "description": "",
        "startDate": "",
        "endDate": "",
        "eventStatus": "https://schema.org/EventScheduled",
        "eventAttendanceMode": "https://schema.org/OfflineEventAttendanceMode",
        "location": {
          "@type": "Place",
          "name": "",
          "address": {
            "@type": "PostalAddress",
            "streetAddress": "",
            "addressLocality": "",
            "postalCode": "",
            "addressCountry": ""
          }
        },
        "organizer": {
          "@type": "Organization",
          "name": ""
        },
        "offers": {
          "@type": "Offer",
          "price": "",
          "priceCurrency": "RUB",
          "availability": "https://schema.org/InStock"
        }
      }
    },
    {
      id: "local_business",
      name: "Местный бизнес",
      type: "LocalBusiness",
      icon: MapPin,
      description: "Покерный клуб как местный бизнес",
      template: {
        "@context": "https://schema.org",
        "@type": "LocalBusiness",
        "name": "",
        "description": "",
        "url": "",
        "telephone": "",
        "address": {
          "@type": "PostalAddress",
          "streetAddress": "",
          "addressLocality": "",
          "postalCode": "",
          "addressCountry": ""
        },
        "geo": {
          "@type": "GeoCoordinates",
          "latitude": "",
          "longitude": ""
        },
        "openingHours": [],
        "priceRange": "$$"
      }
    },
    {
      id: "review",
      name: "Отзывы",
      type: "Review",
      icon: Star,
      description: "Отзывы о покерном клубе или турнирах",
      template: {
        "@context": "https://schema.org",
        "@type": "Review",
        "reviewRating": {
          "@type": "Rating",
          "ratingValue": "",
          "bestRating": "5"
        },
        "author": {
          "@type": "Person",
          "name": ""
        },
        "reviewBody": "",
        "itemReviewed": {
          "@type": "LocalBusiness",
          "name": ""
        }
      }
    },
    {
      id: "faq",
      name: "FAQ",
      type: "FAQPage",
      icon: Users,
      description: "Часто задаваемые вопросы о покере",
      template: {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": ""
            }
          }
        ]
      }
    },
    {
      id: "article",
      name: "Статья",
      type: "Article",
      icon: Calendar,
      description: "Статьи и блог посты о покере",
      template: {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": "",
        "description": "",
        "image": "",
        "author": {
          "@type": "Person",
          "name": ""
        },
        "publisher": {
          "@type": "Organization",
          "name": "",
          "logo": {
            "@type": "ImageObject",
            "url": ""
          }
        },
        "datePublished": "",
        "dateModified": ""
      }
    }
  ];

  const generateSchema = () => {
    const template = schemaTemplates.find(t => t.id === selectedSchema);
    if (!template) return;

    const schema = { ...template.template };
    
    // Merge user data with template
    const mergeData = (target: any, source: any) => {
      for (const key in source) {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
          if (!target[key]) target[key] = {};
          mergeData(target[key], source[key]);
        } else if (source[key]) {
          target[key] = source[key];
        }
      }
    };

    mergeData(schema, schemaData);
    setGeneratedSchema(JSON.stringify(schema, null, 2));
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generatedSchema);
      toast({
        title: "Скопировано!",
        description: "Schema разметка скопирована в буфер обмена",
      });
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось скопировать в буфер обмена",
        variant: "destructive",
      });
    }
  };

  const saveSchema = async () => {
    if (!selectedSchema || !generatedSchema) return;

    setSaving(true);
    try {
      const template = schemaTemplates.find(t => t.id === selectedSchema);
      
      // Save to CMS SEO table with schema markup
      const { error } = await supabase
        .from('cms_seo')
        .upsert({
          page_slug: `schema_${selectedSchema}`,
          meta_title: `${template?.name} Schema`,
          schema_markup: JSON.parse(generatedSchema)
        });

      if (error) throw error;

      toast({
        title: "Сохранено!",
        description: "Schema разметка успешно сохранена",
      });
    } catch (error) {
      console.error('Error saving schema:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить schema разметку",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const downloadSchema = () => {
    if (!generatedSchema) return;
    
    const blob = new Blob([generatedSchema], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedSchema}-schema.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const renderSchemaForm = () => {
    const template = schemaTemplates.find(t => t.id === selectedSchema);
    if (!template) return null;

    switch (selectedSchema) {
      case "organization":
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Название организации</Label>
                <Input
                  value={schemaData.name || ""}
                  onChange={(e) => setSchemaData({ ...schemaData, name: e.target.value })}
                  placeholder="Покерный клуб Ривер"
                />
              </div>
              <div>
                <Label>URL сайта</Label>
                <Input
                  value={schemaData.url || ""}
                  onChange={(e) => setSchemaData({ ...schemaData, url: e.target.value })}
                  placeholder="https://example.com"
                />
              </div>
            </div>
            
            <div>
              <Label>Описание</Label>
              <Textarea
                value={schemaData.description || ""}
                onChange={(e) => setSchemaData({ ...schemaData, description: e.target.value })}
                placeholder="Лучший покерный клуб в городе"
                rows={3}
              />
            </div>

            <div>
              <Label>URL логотипа</Label>
              <Input
                value={schemaData.logo || ""}
                onChange={(e) => setSchemaData({ ...schemaData, logo: e.target.value })}
                placeholder="https://example.com/logo.png"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Адрес</Label>
                <Input
                  value={schemaData.address?.streetAddress || ""}
                  onChange={(e) => setSchemaData({ 
                    ...schemaData, 
                    address: { ...schemaData.address, streetAddress: e.target.value }
                  })}
                  placeholder="ул. Примерная, д. 1"
                />
              </div>
              <div>
                <Label>Город</Label>
                <Input
                  value={schemaData.address?.addressLocality || ""}
                  onChange={(e) => setSchemaData({ 
                    ...schemaData, 
                    address: { ...schemaData.address, addressLocality: e.target.value }
                  })}
                  placeholder="Москва"
                />
              </div>
            </div>

            <div>
              <Label>Телефон</Label>
              <Input
                value={schemaData.contactPoint?.telephone || ""}
                onChange={(e) => setSchemaData({ 
                  ...schemaData, 
                  contactPoint: { ...schemaData.contactPoint, telephone: e.target.value }
                })}
                placeholder="+7 (999) 123-45-67"
              />
            </div>
          </div>
        );

      case "event":
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Название турнира</Label>
                <Input
                  value={schemaData.name || ""}
                  onChange={(e) => setSchemaData({ ...schemaData, name: e.target.value })}
                  placeholder="Еженедельный турнир по Texas Hold'em"
                />
              </div>
              <div>
                <Label>Бай-ин</Label>
                <Input
                  value={schemaData.offers?.price || ""}
                  onChange={(e) => setSchemaData({ 
                    ...schemaData, 
                    offers: { ...schemaData.offers, price: e.target.value }
                  })}
                  placeholder="5000"
                />
              </div>
            </div>

            <div>
              <Label>Описание турнира</Label>
              <Textarea
                value={schemaData.description || ""}
                onChange={(e) => setSchemaData({ ...schemaData, description: e.target.value })}
                placeholder="Захватывающий турнир по покеру для всех уровней игры"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Дата начала</Label>
                <Input
                  type="datetime-local"
                  value={schemaData.startDate || ""}
                  onChange={(e) => setSchemaData({ ...schemaData, startDate: e.target.value })}
                />
              </div>
              <div>
                <Label>Дата окончания</Label>
                <Input
                  type="datetime-local"
                  value={schemaData.endDate || ""}
                  onChange={(e) => setSchemaData({ ...schemaData, endDate: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label>Место проведения</Label>
              <Input
                value={schemaData.location?.name || ""}
                onChange={(e) => setSchemaData({ 
                  ...schemaData, 
                  location: { ...schemaData.location, name: e.target.value }
                })}
                placeholder="Покерный клуб Ривер"
              />
            </div>
          </div>
        );

      default:
        return (
          <div className="p-8 text-center text-muted-foreground">
            <Code className="w-12 h-12 mx-auto mb-4" />
            <p>Выберите тип schema для настройки параметров</p>
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Schema Markup генератор</h2>
          <p className="text-muted-foreground">
            Создайте структурированные данные для лучшего понимания контента поисковыми системами
          </p>
        </div>
      </div>

      <Tabs defaultValue="generator" className="space-y-6">
        <TabsList>
          <TabsTrigger value="generator" className="flex items-center gap-2">
            <Code className="w-4 h-4" />
            Генератор
          </TabsTrigger>
          <TabsTrigger value="preview" className="flex items-center gap-2">
            <Eye className="w-4 h-4" />
            Предпросмотр
          </TabsTrigger>
        </TabsList>

        <TabsContent value="generator" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Schema Templates */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Выберите тип Schema</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {schemaTemplates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => setSelectedSchema(template.id)}
                    className={`w-full p-3 text-left rounded-lg border transition-all ${
                      selectedSchema === template.id 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <template.icon className="w-5 h-5 text-primary" />
                      <div>
                        <div className="font-medium">{template.name}</div>
                        <div className="text-xs text-muted-foreground">{template.description}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </CardContent>
            </Card>

            {/* Schema Form */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {selectedSchema && (
                    <>
                      {schemaTemplates.find(t => t.id === selectedSchema)?.icon && 
                        React.createElement(schemaTemplates.find(t => t.id === selectedSchema)!.icon, { className: "w-5 h-5" })}
                      Настройка {schemaTemplates.find(t => t.id === selectedSchema)?.name}
                    </>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {renderSchemaForm()}
                
                {selectedSchema && (
                  <div className="mt-6 pt-6 border-t">
                    <Button onClick={generateSchema} className="w-full">
                      <Code className="w-4 h-4 mr-2" />
                      Сгенерировать Schema
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="preview" className="space-y-6">
          {generatedSchema ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="w-5 h-5" />
                    Сгенерированная Schema разметка
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={copyToClipboard}>
                      <Copy className="w-4 h-4 mr-2" />
                      Копировать
                    </Button>
                    <Button variant="outline" onClick={downloadSchema}>
                      <Download className="w-4 h-4 mr-2" />
                      Скачать
                    </Button>
                    <Button onClick={saveSchema} disabled={saving}>
                      {saving ? (
                        <div className="w-4 h-4 mr-2 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Save className="w-4 h-4 mr-2" />
                      )}
                      Сохранить
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                  <code>{generatedSchema}</code>
                </pre>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                <Code className="w-12 h-12 mx-auto mb-4" />
                <p>Сгенерируйте schema разметку для предпросмотра</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}