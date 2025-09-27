import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  Zap, 
  Image as ImageIcon, 
  Download, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  BarChart3,
  FileImage,
  Settings
} from "lucide-react";

interface ImageInfo {
  id: string;
  name: string;
  url: string;
  bucket: string;
  path: string;
  size: number;
  optimized: boolean;
  optimizedUrl?: string;
  compressionRatio?: number;
  originalSize?: number;
  optimizedSize?: number;
}

interface OptimizationStats {
  totalImages: number;
  optimizedImages: number;
  totalSizeBefore: number;
  totalSizeAfter: number;
  totalSaved: number;
  averageCompression: number;
}

export function ImageOptimizer() {
  const { toast } = useToast();
  const [images, setImages] = useState<ImageInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [optimizing, setOptimizing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentlyOptimizing, setCurrentlyOptimizing] = useState<string | null>(null);
  const [stats, setStats] = useState<OptimizationStats>({
    totalImages: 0,
    optimizedImages: 0,
    totalSizeBefore: 0,
    totalSizeAfter: 0,
    totalSaved: 0,
    averageCompression: 0
  });

  useEffect(() => {
    loadImages();
  }, []);

  const loadImages = async () => {
    setLoading(true);
    try {
      // Load images from gallery bucket
      const { data: galleryFiles, error: galleryError } = await supabase.storage
        .from('gallery')
        .list('', { limit: 100 });

      if (galleryError) throw galleryError;

      // Load images from testimonials bucket
      const { data: testimonialsFiles, error: testimonialsError } = await supabase.storage
        .from('testimonials')
        .list('', { limit: 100 });

      if (testimonialsError) throw testimonialsError;

      const allImages: ImageInfo[] = [];

      // Process gallery images
      for (const file of galleryFiles || []) {
        if (file.name && isImageFile(file.name)) {
          const { data: { publicUrl } } = supabase.storage
            .from('gallery')
            .getPublicUrl(file.name);

          const isOptimized = file.name.includes('_optimized_');
          
          allImages.push({
            id: `gallery_${file.name}`,
            name: file.name,
            url: publicUrl,
            bucket: 'gallery',
            path: file.name,
            size: file.metadata?.size || 0,
            optimized: isOptimized
          });
        }
      }

      // Process testimonials images
      for (const file of testimonialsFiles || []) {
        if (file.name && isImageFile(file.name)) {
          const { data: { publicUrl } } = supabase.storage
            .from('testimonials')
            .getPublicUrl(file.name);

          const isOptimized = file.name.includes('_optimized_');
          
          allImages.push({
            id: `testimonials_${file.name}`,
            name: file.name,
            url: publicUrl,
            bucket: 'testimonials',
            path: file.name,
            size: file.metadata?.size || 0,
            optimized: isOptimized
          });
        }
      }

      setImages(allImages);
      calculateStats(allImages);
    } catch (error) {
      console.error('Error loading images:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить изображения",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const isImageFile = (filename: string): boolean => {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp'];
    return imageExtensions.some(ext => filename.toLowerCase().endsWith(ext));
  };

  const calculateStats = (imageList: ImageInfo[]) => {
    const totalImages = imageList.length;
    const optimizedImages = imageList.filter(img => img.optimized).length;
    const totalSizeBefore = imageList.reduce((sum, img) => sum + (img.originalSize || img.size), 0);
    const totalSizeAfter = imageList.reduce((sum, img) => sum + (img.optimizedSize || img.size), 0);
    const totalSaved = totalSizeBefore - totalSizeAfter;
    const averageCompression = optimizedImages > 0 
      ? imageList
          .filter(img => img.compressionRatio)
          .reduce((sum, img) => sum + (img.compressionRatio || 0), 0) / optimizedImages
      : 0;

    setStats({
      totalImages,
      optimizedImages,
      totalSizeBefore,
      totalSizeAfter,
      totalSaved,
      averageCompression: Math.round(averageCompression * 100) / 100
    });
  };

  const optimizeImage = async (image: ImageInfo) => {
    setCurrentlyOptimizing(image.id);
    try {
      const { data, error } = await supabase.functions.invoke('optimize-images', {
        body: {
          imageUrl: image.url,
          bucket: image.bucket,
          path: image.path
        }
      });

      if (error) throw error;

      if (data.success) {
        // Update image info with optimization data
        const updatedImages = images.map(img => 
          img.id === image.id 
            ? {
                ...img,
                optimized: true,
                optimizedUrl: data.optimizedUrl,
                compressionRatio: data.compressionRatio,
                originalSize: data.originalSize,
                optimizedSize: data.optimizedSize
              }
            : img
        );
        
        setImages(updatedImages);
        calculateStats(updatedImages);

        toast({
          title: "Успешно",
          description: `Изображение оптимизировано. Сжатие: ${data.compressionRatio}%`,
        });
      } else {
        throw new Error(data.error || 'Optimization failed');
      }
    } catch (error) {
      console.error('Error optimizing image:', error);
      toast({
        title: "Ошибка",
        description: `Не удалось оптимизировать изображение: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setCurrentlyOptimizing(null);
    }
  };

  const optimizeAllImages = async () => {
    const unoptimizedImages = images.filter(img => !img.optimized);
    if (unoptimizedImages.length === 0) {
      toast({
        title: "Информация",
        description: "Все изображения уже оптимизированы",
      });
      return;
    }

    setOptimizing(true);
    setProgress(0);

    for (let i = 0; i < unoptimizedImages.length; i++) {
      await optimizeImage(unoptimizedImages[i]);
      setProgress(Math.round(((i + 1) / unoptimizedImages.length) * 100));
    }

    setOptimizing(false);
    toast({
      title: "Завершено",
      description: `Оптимизировано ${unoptimizedImages.length} изображений`,
    });
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin" />
        <span className="ml-2">Загрузка изображений...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center">
            <Settings className="w-6 h-6 mr-2 text-blue-600" />
            Оптимизация изображений
          </h2>
          <p className="text-muted-foreground">
            Сжимайте изображения для ускорения загрузки сайта
          </p>
        </div>
        <Button 
          onClick={optimizeAllImages}
          disabled={optimizing || images.filter(img => !img.optimized).length === 0}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {optimizing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Оптимизация...
            </>
          ) : (
            <>
              <Zap className="w-4 h-4 mr-2" />
              Оптимизировать все
            </>
          )}
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Всего изображений</p>
                <p className="text-2xl font-bold">{stats.totalImages}</p>
              </div>
              <FileImage className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Оптимизировано</p>
                <p className="text-2xl font-bold">{stats.optimizedImages}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Сэкономлено</p>
                <p className="text-2xl font-bold">{formatFileSize(stats.totalSaved)}</p>
              </div>
              <Download className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Среднее сжатие</p>
                <p className="text-2xl font-bold">{stats.averageCompression}%</p>
              </div>
              <BarChart3 className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress Bar */}
      {optimizing && (
        <Card>
          <CardContent className="p-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Прогресс оптимизации</span>
                <span className="text-sm text-muted-foreground">{progress}%</span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Images List */}
      <Card>
        <CardHeader>
          <CardTitle>Изображения ({images.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {images.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ImageIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Изображения не найдены</p>
            </div>
          ) : (
            <div className="space-y-3">
              {images.map((image) => (
                <div 
                  key={image.id} 
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                >
                  <div className="flex items-center space-x-3">
                    <img 
                      src={image.optimizedUrl || image.url} 
                      alt={image.name}
                      className="w-12 h-12 rounded object-cover"
                    />
                    <div>
                      <p className="font-medium text-sm">{image.name}</p>
                      <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                        <span>{image.bucket}</span>
                        <span>•</span>
                        <span>{formatFileSize(image.size)}</span>
                        {image.compressionRatio && (
                          <>
                            <span>•</span>
                            <span className="text-green-600">-{image.compressionRatio}%</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {image.optimized ? (
                      <Badge className="bg-green-100 text-green-800 border-green-200">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Оптимизировано
                      </Badge>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => optimizeImage(image)}
                        disabled={currentlyOptimizing === image.id}
                        className="text-blue-600 border-blue-200 hover:bg-blue-50"
                      >
                        {currentlyOptimizing === image.id ? (
                          <>
                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                            Оптимизация...
                          </>
                        ) : (
                          <>
                            <Zap className="w-3 h-3 mr-1" />
                            Оптимизировать
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}