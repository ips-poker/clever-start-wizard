import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Upload, 
  Search, 
  Filter, 
  Grid, 
  List, 
  Image as ImageIcon,
  Video,
  FileText,
  Download,
  Trash2,
  Edit,
  Copy,
  Eye,
  FolderPlus,
  Folder
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface MediaFile {
  id: string;
  name: string;
  type: 'image' | 'video' | 'document';
  size: number;
  url: string;
  thumbnail?: string;
  folder: string;
  uploadedAt: string;
  dimensions?: { width: number; height: number };
}

export function MediaLibrary() {
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [folders, setFolders] = useState<string[]>(['gallery', 'uploads', 'icons', 'backgrounds']);
  const [currentFolder, setCurrentFolder] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadMediaFiles();
  }, []);

  const loadMediaFiles = async () => {
    setLoading(true);
    try {
      // Симуляция загрузки файлов (в реальном проекте это будет API)
      const mockFiles: MediaFile[] = [
        {
          id: '1',
          name: 'hero-image.jpg',
          type: 'image',
          size: 1024000,
          url: '/src/assets/luxury-poker-hero.jpg',
          thumbnail: '/src/assets/luxury-poker-hero.jpg',
          folder: 'gallery',
          uploadedAt: new Date().toISOString(),
          dimensions: { width: 1920, height: 1080 }
        },
        {
          id: '2',
          name: 'logo.png',
          type: 'image',
          size: 52000,
          url: '/src/assets/ips-logo.png',
          thumbnail: '/src/assets/ips-logo.png',
          folder: 'icons',
          uploadedAt: new Date().toISOString(),
          dimensions: { width: 256, height: 256 }
        },
        {
          id: '3',
          name: 'tournament-video.mp4',
          type: 'video',
          size: 15600000,
          url: '/videos/tournament.mp4',
          folder: 'gallery',
          uploadedAt: new Date().toISOString()
        }
      ];
      setFiles(mockFiles);
    } catch (error) {
      console.error('Error loading media files:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить медиафайлы",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = event.target.files;
    if (!uploadedFiles) return;

    setLoading(true);
    try {
      // Симуляция загрузки файлов
      for (let i = 0; i < uploadedFiles.length; i++) {
        const file = uploadedFiles[i];
        const newFile: MediaFile = {
          id: Date.now().toString() + i,
          name: file.name,
          type: file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : 'document',
          size: file.size,
          url: URL.createObjectURL(file),
          folder: currentFolder === 'all' ? 'uploads' : currentFolder,
          uploadedAt: new Date().toISOString()
        };
        
        if (file.type.startsWith('image/')) {
          newFile.thumbnail = newFile.url;
        }
        
        setFiles(prev => [newFile, ...prev]);
      }
      
      toast({
        title: "Успешно",
        description: `Загружено ${uploadedFiles.length} файлов`,
      });
      setUploadDialogOpen(false);
    } catch (error) {
      console.error('Error uploading files:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить файлы",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredFiles = files.filter(file => {
    const matchesSearch = file.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFolder = currentFolder === 'all' || file.folder === currentFolder;
    const matchesType = filterType === 'all' || file.type === filterType;
    return matchesSearch && matchesFolder && matchesType;
  });

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'image': return <ImageIcon className="w-5 h-5" />;
      case 'video': return <Video className="w-5 h-5" />;
      default: return <FileText className="w-5 h-5" />;
    }
  };

  const copyFileUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    toast({
      title: "Успешно",
      description: "URL скопирован в буфер обмена",
    });
  };

  const deleteFile = (id: string) => {
    if (!confirm('Удалить файл?')) return;
    setFiles(prev => prev.filter(f => f.id !== id));
    toast({
      title: "Успешно",
      description: "Файл удален",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Медиабиблиотека</h2>
          <p className="text-muted-foreground">Управление изображениями, видео и документами</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Upload className="w-4 h-4" />
                Загрузить файлы
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Загрузка файлов</DialogTitle>
                <DialogDescription>
                  Выберите файлы для загрузки в медиабиблиотеку
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="file-upload">Выберите файлы</Label>
                  <Input
                    id="file-upload"
                    type="file"
                    multiple
                    accept="image/*,video/*,.pdf,.doc,.docx"
                    onChange={handleFileUpload}
                    className="mt-1"
                  />
                </div>
                <div className="text-sm text-muted-foreground">
                  Поддерживаемые форматы: изображения, видео, PDF, документы
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Панель фильтров */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Поиск файлов..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={currentFolder} onValueChange={setCurrentFolder}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все папки</SelectItem>
                {folders.map(folder => (
                  <SelectItem key={folder} value={folder}>{folder}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все типы</SelectItem>
                <SelectItem value="image">Изображения</SelectItem>
                <SelectItem value="video">Видео</SelectItem>
                <SelectItem value="document">Документы</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex border rounded-lg">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                <Grid className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium">Изображения</p>
                <p className="text-2xl font-bold">{files.filter(f => f.type === 'image').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Video className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-sm font-medium">Видео</p>
                <p className="text-2xl font-bold">{files.filter(f => f.type === 'video').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-purple-600" />
              <div>
                <p className="text-sm font-medium">Документы</p>
                <p className="text-2xl font-bold">{files.filter(f => f.type === 'document').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Folder className="w-5 h-5 text-orange-600" />
              <div>
                <p className="text-sm font-medium">Папки</p>
                <p className="text-2xl font-bold">{folders.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Список/Сетка файлов */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="aspect-square bg-muted rounded mb-2"></div>
                <div className="h-4 bg-muted rounded mb-1"></div>
                <div className="h-3 bg-muted rounded w-2/3"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredFiles.map((file) => (
            <Card key={file.id} className="group hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="aspect-square bg-muted rounded mb-3 overflow-hidden relative">
                  {file.type === 'image' && file.thumbnail ? (
                    <img 
                      src={file.thumbnail} 
                      alt={file.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      {getFileIcon(file.type)}
                    </div>
                  )}
                  
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Button size="sm" variant="secondary" onClick={() => copyFileUrl(file.url)}>
                      <Copy className="w-3 h-3" />
                    </Button>
                    <Button size="sm" variant="secondary">
                      <Eye className="w-3 h-3" />
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => deleteFile(file.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-1">
                  <p className="font-medium text-sm truncate">{file.name}</p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{formatFileSize(file.size)}</span>
                    <Badge variant="outline" className="text-xs">{file.folder}</Badge>
                  </div>
                  {file.dimensions && (
                    <p className="text-xs text-muted-foreground">
                      {file.dimensions.width} × {file.dimensions.height}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {filteredFiles.map((file) => (
                <div key={file.id} className="p-4 flex items-center gap-4 hover:bg-muted/50">
                  <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                    {file.type === 'image' && file.thumbnail ? (
                      <img src={file.thumbnail} alt={file.name} className="w-full h-full object-cover rounded" />
                    ) : (
                      getFileIcon(file.type)
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <p className="font-medium">{file.name}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{formatFileSize(file.size)}</span>
                      <Badge variant="outline" className="text-xs">{file.folder}</Badge>
                      {file.dimensions && (
                        <span>{file.dimensions.width} × {file.dimensions.height}</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => copyFileUrl(file.url)}>
                      <Copy className="w-3 h-3" />
                    </Button>
                    <Button size="sm" variant="outline">
                      <Download className="w-3 h-3" />
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => deleteFile(file.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {filteredFiles.length === 0 && !loading && (
        <Card>
          <CardContent className="p-8 text-center">
            <ImageIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Файлы не найдены</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm ? 'Попробуйте изменить критерии поиска' : 'Загрузите первые файлы в медиабиблиотеку'}
            </p>
            <Button onClick={() => setUploadDialogOpen(true)}>
              <Upload className="w-4 h-4 mr-2" />
              Загрузить файлы
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}