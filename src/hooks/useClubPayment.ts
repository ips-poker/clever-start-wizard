import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { SubscriptionPlan } from '@/types/subscription';

interface UseClubPaymentOptions {
  clanId: string;
}

export function useClubPayment({ clanId }: UseClubPaymentOptions) {
  const [loading, setLoading] = useState(false);

  const createCheckout = async (plan: SubscriptionPlan) => {
    if (plan === 'free') {
      toast.error('Бесплатный тариф не требует оплаты');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-club-checkout', {
        body: { plan, clanId }
      });

      if (error) throw error;
      if (!data?.url) throw new Error('No checkout URL received');

      // Open checkout in new tab
      window.open(data.url, '_blank');
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error('Ошибка при создании платежа');
    } finally {
      setLoading(false);
    }
  };

  const openCustomerPortal = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('club-customer-portal');

      if (error) throw error;
      if (!data?.url) throw new Error('No portal URL received');

      window.open(data.url, '_blank');
    } catch (error) {
      console.error('Portal error:', error);
      toast.error('Ошибка при открытии портала');
    } finally {
      setLoading(false);
    }
  };

  const checkSubscription = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('check-club-subscription', {
        body: { clanId }
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Check subscription error:', error);
      return null;
    }
  };

  return {
    loading,
    createCheckout,
    openCustomerPortal,
    checkSubscription
  };
}
