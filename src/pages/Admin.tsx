import React, { useState } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { AdminSidebar } from "@/components/cms/AdminSidebar";
import { AdminDashboard } from "@/components/cms/AdminDashboard";
import { HomePageEditor } from "@/components/cms/HomePageEditor";
import { AboutPageEditor } from "@/components/cms/AboutPageEditor";
import { BlogPageEditor } from "@/components/cms/BlogPageEditor";
import { TestimonialsEditor } from "@/components/cms/TestimonialsEditor";
import { ContactFooterEditor } from "@/components/cms/ContactFooterEditor";
import { ContentManager } from "@/components/cms/ContentManager";
import { GalleryManager } from "@/components/cms/GalleryManager";
import { SEOManager } from "@/components/cms/SEOManager";
import { FileManager } from "@/components/cms/FileManager";
import { IntegrationsManager } from "@/components/cms/IntegrationsManager";
import { BackupManager } from "@/components/cms/BackupManager";
import { SettingsManager } from "@/components/cms/SettingsManager";
import { QuickSetup } from "@/components/cms/QuickSetup";
import { TournamentInvitationGenerator } from "@/components/TournamentInvitationGenerator";
import { SocialInvitationGenerator } from "@/components/SocialInvitationGenerator";
import { AnalyticsOverview } from "@/components/cms/analytics/AnalyticsOverview";
import { MediaLibrary } from "@/components/cms/media/MediaLibrary";
import { WorkflowAutomation } from "@/components/cms/workflows/WorkflowAutomation";
import { PerformanceMonitor } from "@/components/cms/performance/PerformanceMonitor";
import { SecurityDashboard } from "@/components/cms/SecurityDashboard";
import { AdvancedContentManager } from "@/components/cms/AdvancedContentManager";
import { SmartBackupSystem } from "@/components/cms/SmartBackupSystem";
import { EnhancedPerformanceMonitor } from "@/components/cms/EnhancedPerformanceMonitor";
import PlayersManager from "@/components/cms/PlayersManager";
import { OrangeDataIntegration } from "@/components/cms/OrangeDataIntegration";
import { ImageOptimizer } from "@/components/cms/ImageOptimizer";
import { TerminologyMigrationGuide } from "@/components/TerminologyMigrationGuide";
import { TelegramBotConfigurator } from "@/components/telegram/TelegramBotConfigurator";
import { DatabaseProxyTest } from "@/components/DatabaseProxyTest";
import { SupabaseProxyDocs } from "@/components/cms/SupabaseProxyDocs";

export default function Admin() {
  const [activeTab, setActiveTab] = useState("dashboard");

  const renderTabContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <AdminDashboard onTabChange={setActiveTab} />;
      case "quick-setup":
        return <QuickSetup />;
      case "home-editor":
        return <HomePageEditor />;
      case "about-editor":
        return <AboutPageEditor />;
      case "blog-editor":
        return <BlogPageEditor />;
      case "testimonials":
        return <TestimonialsEditor />;
      case "contact-footer":
        return <ContactFooterEditor />;
      case "content":
        return <ContentManager />;
      case "gallery":
        return <GalleryManager />;
      case "seo":
        return <SEOManager />;
      case "image-optimizer":
        return <ImageOptimizer />;
      case "files":
        return <FileManager />;
      case "integrations":
        return <IntegrationsManager />;
      case "backup":
        return <BackupManager />;
      case "settings":
        return <SettingsManager />;
      case "analytics":
        return <AnalyticsOverview />;
      case "performance":
        return <PerformanceMonitor />;
      case "media":
        return <MediaLibrary />;
      case "workflows":
        return <WorkflowAutomation />;
      case "security":
        return <SecurityDashboard />;
      case "advanced-content":
        return <AdvancedContentManager />;
      case "smart-backup":
        return <SmartBackupSystem />;
      case "enhanced-performance":
        return <EnhancedPerformanceMonitor />;
      case "orange-data":
        return <OrangeDataIntegration />;
      case "telegram-config":
        return <TelegramBotConfigurator />;
      case "invitations":
        return <SocialInvitationGenerator />;
      case "tournaments":
        return (
          <div className="p-8">
            <h2 className="text-2xl font-bold mb-4">Управление турнирами</h2>
            <p className="text-muted-foreground">
              Функционал управления турнирами будет добавлен в следующих обновлениях.
            </p>
          </div>
        );
      case "players":
        return <PlayersManager />;
      case "terminology-migration":
        return <TerminologyMigrationGuide />;
      case "database-test":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">Тест подключения к БД</h2>
              <p className="text-muted-foreground mb-6">
                Проверка работы базы данных через прокси-сервер
              </p>
            </div>
            <DatabaseProxyTest />
          </div>
        );
      case "proxy-docs":
        return <SupabaseProxyDocs />;
      case "cache-management":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">Управление кэшем</h2>
              <p className="text-muted-foreground mb-6">
                Мониторинг и управление системой кэширования данных
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Пример: Турниры с кэшированием</h3>
              <p className="text-muted-foreground">Компонент кэширования временно недоступен</p>
            </div>
          </div>
        );
      default:
        return <AdminDashboard />;
    }
  };

  return (
    <AuthGuard requireAdmin={true}>
      <div className="min-h-screen bg-background">
        <Header />
      
      <SidebarProvider>
        <div className="flex min-h-screen w-full">
          {/* Global Trigger */}
          <header className="fixed top-16 left-0 z-50 h-12 flex items-center border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <SidebarTrigger className="ml-2" />
          </header>

          <AdminSidebar activeTab={activeTab} onTabChange={setActiveTab} />
          
          <main className="flex-1 pt-12">
            <div className="container mx-auto p-2 sm:p-4 lg:p-6">
              <div className="bg-card border rounded-lg p-3 sm:p-4 lg:p-6 shadow-sm">
                {renderTabContent()}
              </div>
            </div>
          </main>
        </div>
      </SidebarProvider>

        <Footer />
      </div>
    </AuthGuard>
  );
}