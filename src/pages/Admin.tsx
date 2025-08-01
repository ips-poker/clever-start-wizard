import { useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TournamentInvitationGenerator } from "@/components/TournamentInvitationGenerator";
import { ContentManager } from "@/components/cms/ContentManager";
import { GalleryManager } from "@/components/cms/GalleryManager";
import { SEOManager } from "@/components/cms/SEOManager";
import { SettingsManager } from "@/components/cms/SettingsManager";
import { FileManager } from "@/components/cms/FileManager";
import { IntegrationsManager } from "@/components/cms/IntegrationsManager";
import { BackupManager } from "@/components/cms/BackupManager";
import { SitePreview } from "@/components/cms/SitePreview";
import { Settings, FileText, Users, Trophy, Image, Search, Globe, Palette, Upload, Zap, HardDrive, Eye } from "lucide-react";

export default function Admin() {
  const [activeTab, setActiveTab] = useState("invitations");

  const adminTabs = [
    { id: "content", name: "Контент", icon: FileText },
    { id: "preview", name: "Превью сайта", icon: Eye },
    { id: "gallery", name: "Галерея", icon: Image },
    { id: "seo", name: "SEO", icon: Search },
    { id: "settings", name: "Настройки", icon: Settings },
    { id: "files", name: "Файлы", icon: Upload },
    { id: "integrations", name: "Интеграции", icon: Zap },
    { id: "backup", name: "Резервные копии", icon: HardDrive },
    { id: "invitations", name: "Приглашения", icon: FileText },
    { id: "tournaments", name: "Турниры", icon: Trophy },
    { id: "players", name: "Игроки", icon: Users },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          <div className="max-w-7xl mx-auto">
            {/* Admin Header */}
            <div className="mb-8">
              <h1 className="text-4xl font-bold text-foreground mb-2">
                Административная панель
              </h1>
              <p className="text-muted-foreground text-lg">
                Управление турнирами и генерация приглашений
              </p>
            </div>

            {/* Navigation Tabs */}
            <div className="flex flex-wrap gap-2 mb-8">
              {adminTabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <Button
                    key={tab.id}
                    variant={activeTab === tab.id ? "default" : "outline"}
                    onClick={() => setActiveTab(tab.id)}
                    className="flex items-center gap-2"
                  >
                    <Icon size={16} />
                    {tab.name}
                  </Button>
                );
              })}
            </div>

            {/* Content Area */}
            <div className="space-y-6">
              {activeTab === "content" && <ContentManager />}

              {activeTab === "preview" && <SitePreview />}

              {activeTab === "invitations" && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      Генератор приглашений на турнир
                    </CardTitle>
                    <CardDescription>
                      Создайте продающее приглашение для турнира с автоматической генерацией PDF
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <TournamentInvitationGenerator />
                  </CardContent>
                </Card>
              )}


              {activeTab === "gallery" && <GalleryManager />}

              {activeTab === "files" && <FileManager />}

              {activeTab === "seo" && <SEOManager />}

              {activeTab === "integrations" && <IntegrationsManager />}

              {activeTab === "backup" && <BackupManager />}

              {activeTab === "settings" && <SettingsManager />}

              {activeTab === "tournaments" && (
                <Card>
                  <CardHeader>
                    <CardTitle>Управление турнирами</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">Функционал управления турнирами будет добавлен позже</p>
                  </CardContent>
                </Card>
              )}

              {activeTab === "players" && (
                <Card>
                  <CardHeader>
                    <CardTitle>Управление игроками</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">Функционал управления игроками будет добавлен позже</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}