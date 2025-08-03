import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OrangeDataConfig {
  api_key: string;
  sign_key: string;
  inn: string;
  group: string;
  test_mode: boolean;
}

interface ReceiptItem {
  name: string;
  price: number;
  quantity: number;
  vat: 'vat0' | 'vat10' | 'vat20' | 'vat110' | 'vat120' | 'no_vat';
}

interface ReceiptData {
  amount: number;
  email: string;
  tax_system: string;
  test_mode: boolean;
  items: ReceiptItem[];
  phone?: string;
  client_name?: string;
  payment_type?: 'cash' | 'card' | 'prepaid' | 'credit' | 'other';
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Authorization header is required");
    }

    // Create Supabase client for authentication
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error("Authentication failed");
    }

    const receiptData: ReceiptData = await req.json();

    // Get Orange Data configuration
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: configData, error: configError } = await supabaseService
      .from('cms_integrations')
      .select('*')
      .eq('integration_name', 'orange_data')
      .eq('is_active', true)
      .single();

    if (configError || !configData) {
      throw new Error("Orange Data integration is not configured or disabled");
    }

    const config: OrangeDataConfig = {
      api_key: configData.api_keys?.api_key,
      sign_key: configData.api_keys?.sign_key,
      inn: configData.config?.inn,
      group: configData.config?.group,
      test_mode: configData.config?.test_mode || false
    };

    if (!config.api_key || !config.sign_key || !config.inn || !config.group) {
      throw new Error("Orange Data configuration is incomplete");
    }

    // Prepare receipt for Orange Data
    const orangeDataReceipt = {
      id: crypto.randomUUID(),
      inn: config.inn,
      group: config.group,
      content: {
        type: 1, // Приход
        positions: receiptData.items.map((item, index) => ({
          quantity: item.quantity,
          price: item.price,
          tax: getVatRate(item.vat),
          text: item.name,
          paymentMethodType: 4, // Полная оплата
          paymentSubjectType: 1, // Товар
          nomenclatureCode: `item_${index + 1}`
        })),
        checkClose: {
          payments: [{
            type: receiptData.payment_type === 'cash' ? 1 : 2, // 1 = наличные, 2 = безналичные
            amount: receiptData.amount
          }],
          taxationSystem: getTaxationSystem(receiptData.tax_system)
        },
        customerContact: receiptData.email,
        ...(receiptData.phone && { customerContactPhone: receiptData.phone })
      }
    };

    // Create signature
    const signature = await createSignature(orangeDataReceipt, config.sign_key);

    // Send to Orange Data API
    const orangeDataUrl = config.test_mode 
      ? 'https://apip.orangedata.ru:2443/api/v2/documents/'
      : 'https://api.orangedata.ru:12003/api/v2/documents/';

    console.log('Sending receipt to Orange Data:', {
      url: orangeDataUrl,
      receiptId: orangeDataReceipt.id,
      test_mode: config.test_mode
    });

    const response = await fetch(orangeDataUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Signature': signature
      },
      body: JSON.stringify(orangeDataReceipt)
    });

    const responseText = await response.text();
    let responseData;

    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { raw_response: responseText };
    }

    console.log('Orange Data response:', {
      status: response.status,
      data: responseData
    });

    if (!response.ok) {
      throw new Error(`Orange Data API error: ${response.status} - ${responseText}`);
    }

    // Save receipt to database
    try {
      await supabaseService.from('fiscal_receipts').insert({
        receipt_id: orangeDataReceipt.id,
        user_id: user.id,
        amount: receiptData.amount,
        status: 'sent',
        orange_data_response: responseData,
        items: receiptData.items,
        created_at: new Date().toISOString()
      });
    } catch (dbError) {
      console.error('Failed to save receipt to database:', dbError);
      // Don't fail the entire request if DB save fails
    }

    return new Response(JSON.stringify({
      success: true,
      receipt_id: orangeDataReceipt.id,
      message: "Чек успешно отправлен в Orange Data",
      orange_data_response: responseData
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error('Orange Data receipt error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      message: "Ошибка при отправке чека в Orange Data"
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

async function createSignature(data: any, signKey: string): Promise<string> {
  const jsonString = JSON.stringify(data);
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(jsonString);
  const keyBuffer = encoder.encode(signKey);
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBuffer,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, dataBuffer);
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

function getVatRate(vat: string): number {
  const vatMap: Record<string, number> = {
    'vat0': 1,      // НДС 0%
    'vat10': 2,     // НДС 10%
    'vat20': 1,     // НДС 20%
    'vat110': 4,    // НДС 10/110
    'vat120': 3,    // НДС 20/120
    'no_vat': 6     // Без НДС
  };
  return vatMap[vat] || 6;
}

function getTaxationSystem(system: string): number {
  const systemMap: Record<string, number> = {
    'osn': 1,           // ОСН
    'usn_income': 2,    // УСН доходы
    'usn_income_outcome': 3, // УСН доходы минус расходы
    'envd': 4,          // ЕНВД
    'esn': 5,           // ЕСН
    'patent': 6         // Патентная система
  };
  return systemMap[system] || 2;
}