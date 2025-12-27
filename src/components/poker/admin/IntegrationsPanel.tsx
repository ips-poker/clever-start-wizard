import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import {
  Webhook,
  Key,
  Globe,
  Server,
  Database,
  Shield,
  Zap,
  Settings,
  Link,
  Unlink,
  CheckCircle,
  XCircle,
  Clock,
  Copy,
  RefreshCw,
  Eye,
  EyeOff,
  PlayCircle,
  Send
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface WebhookConfig {
  id: string;
  name: string;
  url: string;
  events: string[];
  isActive: boolean;
  lastTriggered: Date | null;
  successRate: number;
}

interface APIEndpoint {
  path: string;
  method: string;
  description: string;
  requiresAuth: boolean;
  rateLimit: string;
}

const API_ENDPOINTS: APIEndpoint[] = [
  {
    path: '/api/tables',
    method: 'GET',
    description: 'List all active tables',
    requiresAuth: true,
    rateLimit: '100/min'
  },
  {
    path: '/api/tables/:id',
    method: 'GET',
    description: 'Get table details and players',
    requiresAuth: true,
    rateLimit: '200/min'
  },
  {
    path: '/api/tournaments',
    method: 'GET',
    description: 'List all tournaments',
    requiresAuth: true,
    rateLimit: '100/min'
  },
  {
    path: '/api/tournaments/:id/standings',
    method: 'GET',
    description: 'Get tournament standings',
    requiresAuth: true,
    rateLimit: '50/min'
  },
  {
    path: '/api/players/:id/stats',
    method: 'GET',
    description: 'Get player statistics',
    requiresAuth: true,
    rateLimit: '100/min'
  },
  {
    path: '/api/hands/:id',
    method: 'GET',
    description: 'Get hand history details',
    requiresAuth: true,
    rateLimit: '200/min'
  },
  {
    path: '/ws/table/:id',
    method: 'WS',
    description: 'WebSocket connection for real-time table updates',
    requiresAuth: true,
    rateLimit: '1 connection'
  },
  {
    path: '/ws/tournament/:id',
    method: 'WS',
    description: 'WebSocket for tournament events',
    requiresAuth: true,
    rateLimit: '1 connection'
  }
];

const WEBHOOK_EVENTS = [
  'hand.started',
  'hand.completed',
  'player.joined',
  'player.left',
  'player.eliminated',
  'tournament.started',
  'tournament.completed',
  'level.changed',
  'payout.processed'
];

export function IntegrationsPanel() {
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([]);
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKey] = useState('sk_live_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15));
  const [newWebhook, setNewWebhook] = useState({
    name: '',
    url: '',
    events: [] as string[]
  });
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Simulated webhook loading
  useEffect(() => {
    setWebhooks([
      {
        id: '1',
        name: 'Discord Notifications',
        url: 'https://discord.com/api/webhooks/...',
        events: ['tournament.started', 'tournament.completed'],
        isActive: true,
        lastTriggered: new Date(Date.now() - 3600000),
        successRate: 98.5
      },
      {
        id: '2',
        name: 'Analytics Backend',
        url: 'https://analytics.example.com/poker',
        events: ['hand.completed', 'player.eliminated'],
        isActive: true,
        lastTriggered: new Date(Date.now() - 60000),
        successRate: 100
      }
    ]);
  }, []);

  const handleCopyApiKey = () => {
    navigator.clipboard.writeText(apiKey);
    toast.success('API key copied to clipboard');
  };

  const handleRegenerateApiKey = () => {
    if (!confirm('Regenerate API key? All existing integrations will need to be updated.')) return;
    toast.success('API key regenerated');
  };

  const handleToggleWebhook = (id: string) => {
    setWebhooks(prev => prev.map(w => 
      w.id === id ? { ...w, isActive: !w.isActive } : w
    ));
    toast.success('Webhook status updated');
  };

  const handleDeleteWebhook = (id: string) => {
    setWebhooks(prev => prev.filter(w => w.id !== id));
    toast.success('Webhook deleted');
  };

  const handleCreateWebhook = () => {
    if (!newWebhook.name || !newWebhook.url) {
      toast.error('Name and URL are required');
      return;
    }

    const webhook: WebhookConfig = {
      id: Date.now().toString(),
      name: newWebhook.name,
      url: newWebhook.url,
      events: newWebhook.events,
      isActive: true,
      lastTriggered: null,
      successRate: 100
    };

    setWebhooks(prev => [...prev, webhook]);
    setNewWebhook({ name: '', url: '', events: [] });
    toast.success('Webhook created');
  };

  const handleTestWebhook = async (webhook: WebhookConfig) => {
    setTestResult({ success: true, message: 'Testing...' });
    
    // Simulate test
    await new Promise(r => setTimeout(r, 1000));
    
    const success = Math.random() > 0.1;
    setTestResult({
      success,
      message: success 
        ? `Successfully delivered test event to ${webhook.url}` 
        : 'Failed to deliver. Check URL and try again.'
    });
  };

  const handleTestApiEndpoint = async (endpoint: APIEndpoint) => {
    toast.info(`Testing ${endpoint.method} ${endpoint.path}...`);
    
    // Simulate test
    await new Promise(r => setTimeout(r, 500));
    
    toast.success(`${endpoint.method} ${endpoint.path} - 200 OK`);
  };

  const toggleWebhookEvent = (event: string) => {
    setNewWebhook(prev => ({
      ...prev,
      events: prev.events.includes(event)
        ? prev.events.filter(e => e !== event)
        : [...prev.events, event]
    }));
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="api">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="api" className="gap-1">
            <Key className="h-4 w-4" />
            API Access
          </TabsTrigger>
          <TabsTrigger value="webhooks" className="gap-1">
            <Webhook className="h-4 w-4" />
            Webhooks
          </TabsTrigger>
          <TabsTrigger value="endpoints" className="gap-1">
            <Globe className="h-4 w-4" />
            Endpoints
          </TabsTrigger>
        </TabsList>

        {/* API Access Tab */}
        <TabsContent value="api" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                API Key
              </CardTitle>
              <CardDescription>
                Use this key to authenticate requests to the Poker Engine API
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Input
                    type={showApiKey ? 'text' : 'password'}
                    value={apiKey}
                    readOnly
                    className="pr-20 font-mono text-sm"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 -translate-y-1/2"
                    onClick={() => setShowApiKey(!showApiKey)}
                  >
                    {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <Button variant="outline" onClick={handleCopyApiKey}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={handleRegenerateApiKey}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Regenerate Key
                </Button>
              </div>

              <div className="p-4 bg-muted/30 rounded-lg">
                <p className="text-sm font-medium mb-2">Usage Example</p>
                <pre className="text-xs bg-background p-3 rounded overflow-x-auto">
{`curl -X GET "https://syndicate-poker-server.ru/api/tables" \\
  -H "Authorization: Bearer ${showApiKey ? apiKey : 'sk_live_***'}" \\
  -H "Content-Type: application/json"`}
                </pre>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Security Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>IP Whitelist</Label>
                  <p className="text-sm text-muted-foreground">Restrict API access to specific IPs</p>
                </div>
                <Switch />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Rate Limiting</Label>
                  <p className="text-sm text-muted-foreground">Apply request limits per minute</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Audit Logging</Label>
                  <p className="text-sm text-muted-foreground">Log all API requests</p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Webhooks Tab */}
        <TabsContent value="webhooks" className="mt-4 space-y-4">
          {/* Existing Webhooks */}
          <Card>
            <CardHeader>
              <CardTitle>Active Webhooks</CardTitle>
            </CardHeader>
            <CardContent>
              {webhooks.length === 0 ? (
                <p className="text-center py-4 text-muted-foreground">
                  No webhooks configured
                </p>
              ) : (
                <div className="space-y-3">
                  {webhooks.map(webhook => (
                    <div key={webhook.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{webhook.name}</span>
                          <Badge variant={webhook.isActive ? 'default' : 'secondary'}>
                            {webhook.isActive ? 'Active' : 'Paused'}
                          </Badge>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleTestWebhook(webhook)}
                          >
                            <PlayCircle className="h-4 w-4 mr-1" />
                            Test
                          </Button>
                          <Switch
                            checked={webhook.isActive}
                            onCheckedChange={() => handleToggleWebhook(webhook.id)}
                          />
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground font-mono mb-2">
                        {webhook.url}
                      </p>
                      <div className="flex flex-wrap gap-1 mb-2">
                        {webhook.events.map(event => (
                          <Badge key={event} variant="outline" className="text-xs">
                            {event}
                          </Badge>
                        ))}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {webhook.lastTriggered 
                            ? `Last: ${webhook.lastTriggered.toLocaleString()}`
                            : 'Never triggered'
                          }
                        </span>
                        <span className={webhook.successRate >= 95 ? 'text-green-500' : 'text-yellow-500'}>
                          {webhook.successRate}% success
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-destructive"
                          onClick={() => handleDeleteWebhook(webhook.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Create Webhook */}
          <Card>
            <CardHeader>
              <CardTitle>Create Webhook</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Webhook Name</Label>
                  <Input
                    placeholder="My Webhook"
                    value={newWebhook.name}
                    onChange={e => setNewWebhook(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Endpoint URL</Label>
                  <Input
                    placeholder="https://example.com/webhook"
                    value={newWebhook.url}
                    onChange={e => setNewWebhook(prev => ({ ...prev, url: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <Label className="mb-2 block">Events</Label>
                <div className="flex flex-wrap gap-2">
                  {WEBHOOK_EVENTS.map(event => (
                    <Badge
                      key={event}
                      variant={newWebhook.events.includes(event) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => toggleWebhookEvent(event)}
                    >
                      {event}
                    </Badge>
                  ))}
                </div>
              </div>

              <Button onClick={handleCreateWebhook}>
                <Webhook className="h-4 w-4 mr-2" />
                Create Webhook
              </Button>

              {testResult && (
                <div className={`p-3 rounded-lg ${testResult.success ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'} border`}>
                  <div className="flex items-center gap-2">
                    {testResult.success 
                      ? <CheckCircle className="h-4 w-4 text-green-500" />
                      : <XCircle className="h-4 w-4 text-red-500" />
                    }
                    <span className="text-sm">{testResult.message}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* API Endpoints Tab */}
        <TabsContent value="endpoints" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Available API Endpoints</CardTitle>
              <CardDescription>
                Base URL: https://syndicate-poker-server.ru
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <div className="space-y-2">
                  {API_ENDPOINTS.map((endpoint, i) => (
                    <div key={i} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge className={
                            endpoint.method === 'GET' ? 'bg-green-500' :
                            endpoint.method === 'POST' ? 'bg-blue-500' :
                            endpoint.method === 'WS' ? 'bg-purple-500' :
                            'bg-amber-500'
                          }>
                            {endpoint.method}
                          </Badge>
                          <code className="text-sm font-mono">{endpoint.path}</code>
                        </div>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleTestApiEndpoint(endpoint)}
                        >
                          <Send className="h-4 w-4 mr-1" />
                          Test
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {endpoint.description}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        {endpoint.requiresAuth && (
                          <span className="flex items-center gap-1">
                            <Shield className="h-3 w-3" />
                            Auth required
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Zap className="h-3 w-3" />
                          {endpoint.rateLimit}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
