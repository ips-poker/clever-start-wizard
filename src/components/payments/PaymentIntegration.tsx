import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  CreditCard, 
  Receipt, 
  CheckCircle, 
  AlertTriangle,
  DollarSign,
  Clock,
  Mail
} from "lucide-react";

interface PaymentIntegrationProps {
  onPaymentSuccess?: (paymentData: any) => void;
}

interface PaymentFormData {
  amount: number;
  email: string;
  description: string;
  customer_name: string;
  phone?: string;
  fiscal_email?: string;
}

export function PaymentIntegration({ onPaymentSuccess }: PaymentIntegrationProps) {
  const [formData, setFormData] = useState<PaymentFormData>({
    amount: 0,
    email: '',
    description: '',
    customer_name: '',
    phone: '',
    fiscal_email: ''
  });
  const [processing, setProcessing] = useState(false);
  const [sendingReceipt, setSendingReceipt] = useState(false);

  const { toast } = useToast();

  const processPayment = async () => {
    if (!formData.amount || !formData.email || !formData.description) {
      toast({
        title: "Ошибка",
        description: "Заполните все обязательные поля",
        variant: "destructive",
      });
      return;
    }

    setProcessing(true);
    try {
      // Create payment session (this would integrate with your payment provider)
      const { data, error } = await supabase.functions.invoke('create-payment', {
        body: {
          amount: formData.amount * 100, // Convert to kopecks
          email: formData.email,
          description: formData.description,
          customer_name: formData.customer_name,
          phone: formData.phone
        }
      });

      if (error) throw error;

      // Redirect to payment
      if (data.url) {
        window.location.href = data.url;
      }

      // If auto-fiscalization is enabled, send fiscal receipt
      if (formData.fiscal_email) {
        await sendFiscalReceipt();
      }

      onPaymentSuccess?.(data);
    } catch (error: any) {
      toast({
        title: "Ошибка оплаты",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const sendFiscalReceipt = async () => {
    setSendingReceipt(true);
    try {
      const { data, error } = await supabase.functions.invoke('orange-data-receipt', {
        body: {
          amount: formData.amount * 100,
          email: formData.fiscal_email || formData.email,
          tax_system: 'usn_income',
          test_mode: true, // Change to false for production
          items: [{
            name: formData.description,
            price: formData.amount * 100,
            quantity: 1,
            vat: 'no_vat'
          }],
          phone: formData.phone,
          client_name: formData.customer_name,
          payment_type: 'card'
        }
      });

      if (error) throw error;

      toast({
        title: "Фискальный чек отправлен",
        description: `Чек отправлен на ${formData.fiscal_email || formData.email}`,
      });
    } catch (error: any) {
      toast({
        title: "Ошибка фискализации",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSendingReceipt(false);
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Оплата услуг
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Сумма (рублей) *</Label>
            <div className="relative">
              <DollarSign className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
              <Input
                type="number"
                value={formData.amount || ''}
                onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                placeholder="1000"
                className="pl-10"
                min="1"
                step="1"
              />
            </div>
          </div>

          <div>
            <Label>Email для оплаты *</Label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="client@example.com"
                className="pl-10"
              />
            </div>
          </div>

          <div>
            <Label>Описание услуги *</Label>
            <Input
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Участие в турнире"
            />
          </div>

          <div>
            <Label>ФИО клиента</Label>
            <Input
              value={formData.customer_name}
              onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
              placeholder="Иванов Иван Иванович"
            />
          </div>

          <div>
            <Label>Телефон</Label>
            <Input
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+7 (xxx) xxx-xx-xx"
            />
          </div>

          <div>
            <Label>Email для фискального чека</Label>
            <div className="relative">
              <Receipt className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
              <Input
                type="email"
                value={formData.fiscal_email}
                onChange={(e) => setFormData({ ...formData, fiscal_email: e.target.value })}
                placeholder="fiscal@example.com (опционально)"
                className="pl-10"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Если не указан, будет использован email для оплаты
            </p>
          </div>

          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              После нажатия кнопки вы будете перенаправлены на страницу оплаты.
              Фискальный чек будет автоматически отправлен после успешной оплаты.
            </AlertDescription>
          </Alert>

          <div className="flex gap-2">
            <Button 
              onClick={processPayment} 
              disabled={processing || sendingReceipt}
              className="flex-1"
            >
              <CreditCard className={`w-4 h-4 mr-2 ${processing ? 'animate-pulse' : ''}`} />
              {processing ? 'Обработка...' : `Оплатить ${formData.amount ? formData.amount + ' ₽' : ''}`}
            </Button>
            
            {formData.fiscal_email && (
              <Button 
                onClick={sendFiscalReceipt} 
                disabled={sendingReceipt || processing}
                variant="outline"
              >
                <Receipt className={`w-4 h-4 mr-2 ${sendingReceipt ? 'animate-pulse' : ''}`} />
                {sendingReceipt ? 'Отправка...' : 'Чек'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Информация о платеже</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span>Безопасная оплата через Stripe</span>
          </div>
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-blue-500" />
            <span>Автоматическая фискализация чеков</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-orange-500" />
            <span>Мгновенное зачисление средств</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}