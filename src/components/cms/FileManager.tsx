import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Upload, Plus, Edit, Save, X, Trash2, FileText, Image, Video, Music, File } from "lucide-react";

interface FileItem {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  folder: string;
  created_at: string;
  updated_at: string;
}

export function FileManager() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentFolder, setCurrentFolder] = useState('uploads');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const { toast } = useToast();

  const folders = [
    { value: 'uploads', label: 'Загрузки' },
    { value: 'images', label: 'Изображения' },
    { value: 'documents', label: 'Документы' },
    { value: 'media', label: 'Медиа' },
    { value: 'gallery', label: 'Галерея' },
  ];

  useEffect(() => {
    fetchFiles();
  }, [currentFolder]);

  const fetchFiles = async () => {
    setLoading(true);
    try {
      // Имитация загрузки файлов - в реальности здесь будет Supabase Storage
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Пример данных для демонстрации
      const mockFiles: FileItem[] = [
        {
          id: '1',
          name: 'hero-image.jpg',
          size: 245760,
          type: 'image/jpeg',
          url: '/assets/poker-table-hero.jpg',
          folder: currentFolder,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: '2', 
          name: 'tournament-rules.pdf',
          size: 1024000,
          type: 'application/pdf',
          url: '#',
          folder: currentFolder,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
      ];
      
      setFiles(mockFiles);
    } catch (error) {
      console.error('Error fetching files:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить файлы",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setSelectedFiles(files);
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      toast({
        title: "Ошибка",
        description: "Выберите файлы для загрузки",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        
        // Имитация загрузки файла
        await new Promise(resolve => {
          const interval = setInterval(() => {
            setUploadProgress(prev => {
              const newProgress = prev + (100 / selectedFiles.length) / 10;
              if (newProgress >= (i + 1) * (100 / selectedFiles.length)) {
                clearInterval(interval);
                resolve(true);
              }
              return Math.min(newProgress, 100);
            });
          }, 100);
        });

        // В реальности здесь будет загрузка в Supabase Storage
        console.log(`Uploading file: ${file.name} to folder: ${currentFolder}`);
      }

      toast({
        title: "Успешно",
        description: `Загружено ${selectedFiles.length} файлов`,
      });

      setSelectedFiles([]);
      await fetchFiles();
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Ошибка",
        description: "Ошибка при загрузке файлов",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить файл?')) return;
    
    try {
      // В реальности здесь будет удаление из Supabase Storage
      setFiles(files.filter(f => f.id !== id));
      toast({
        title: "Успешно",
        description: "Файл удален",
      });
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось удалить файл",
        variant: "destructive",
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return Image;
    if (type.startsWith('video/')) return Video;
    if (type.startsWith('audio/')) return Music;
    if (type === 'application/pdf' || type.includes('document')) return FileText;
    return File;
  };

  const copyToClipboard = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast({
        title: "Скопировано",
        description: "URL файла скопирован в буфер обмена",
      });
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось скопировать URL",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Файловый менеджер</h2>
          <p className="text-muted-foreground">Управление файлами и медиа контентом</p>
        </div>
        
        <div className="flex items-center gap-4">
          <Select value={currentFolder} onValueChange={setCurrentFolder}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {folders.map((folder) => (
                <SelectItem key={folder.value} value={folder.value}>
                  {folder.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Upload Area */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload size={20} />
            Загрузка файлов
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="file-upload">Выберите файлы</Label>
            <Input
              id="file-upload"
              type="file"
              multiple
              accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
              onChange={handleFileSelect}
              disabled={uploading}
            />
          </div>

          {selectedFiles.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-semibold">Выбранные файлы:</h4>
              <div className="space-y-1">
                {selectedFiles.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                    <span className="text-sm">{file.name}</span>
                    <span className="text-xs text-muted-foreground">{formatFileSize(file.size)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {uploading && (
            <div className="space-y-2">
              <Label>Прогресс загрузки:</Label>
              <Progress value={uploadProgress} className="w-full" />
              <p className="text-sm text-muted-foreground">{Math.round(uploadProgress)}% завершено</p>
            </div>
          )}

          <div className="flex justify-end">
            <Button 
              onClick={handleUpload} 
              disabled={selectedFiles.length === 0 || uploading}
              className="flex items-center gap-2"
            >
              <Upload size={16} />
              {uploading ? 'Загрузка...' : 'Загрузить файлы'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Files Grid */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">
          Файлы в папке "{folders.find(f => f.value === currentFolder)?.label}"
        </h3>

        {loading ? (
          <div className="flex items-center justify-center p-8">Загрузка...</div>
        ) : files.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <File className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Папка пуста</h3>
              <p className="text-muted-foreground">Загрузите первые файлы</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {files.map((file) => {
              const FileIcon = getFileIcon(file.type);
              const isImage = file.type.startsWith('image/');
              
              return (
                <Card key={file.id} className="overflow-hidden">
                  <div className="relative">
                    {isImage ? (
                      <img
                        src={file.url}
                        alt={file.name}
                        className="w-full h-32 object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          target.nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                    ) : (
                      <div className="w-full h-32 bg-muted/50 flex items-center justify-center">
                        <FileIcon size={32} className="text-muted-foreground" />
                      </div>
                    )}
                    
                    <div className="absolute top-2 right-2 flex gap-1">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => copyToClipboard(file.url)}
                        title="Скопировать URL"
                      >
                        📋
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(file.id)}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>

                  <CardContent className="p-3">
                    <div className="space-y-1">
                      <h4 className="font-semibold text-sm truncate" title={file.name}>
                        {file.name}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(file.size)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(file.created_at).toLocaleDateString('ru-RU')}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}