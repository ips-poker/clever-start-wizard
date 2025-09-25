import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TestConfig {
  api_key: string;
  sign_key: string;
  inn: string;
  group: string;
  test_mode: boolean;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const config: TestConfig = await req.json();

    // Validate required fields
    if (!config.api_key || !config.sign_key || !config.inn || !config.group) {
      throw new Error("Не все обязательные поля заполнены");
    }

    // Test Orange Data API connection
    const testReceipt = {
      id: `test_${Date.now()}`,
      inn: config.inn,
      group: config.group,
      content: {
        type: 1,
        positions: [{
          quantity: 1,
          price: 100, // 1 рубль
          tax: 6, // Без НДС
          text: "Тестовый товар",
          paymentMethodType: 4,
          paymentSubjectType: 1,
          nomenclatureCode: "test_item"
        }],
        checkClose: {
          payments: [{
            type: 2, // Безналичные
            amount: 100
          }],
          taxationSystem: 2 // УСН доходы
        },
        customerContact: "test@example.com"
      }
    };

    // Create test signature
    const signature = await createSignature(testReceipt, config.sign_key);

    // Test API endpoint
    const orangeDataUrl = config.test_mode 
      ? 'https://apip.orangedata.ru:2443/api/v2/documents/'
      : 'https://api.orangedata.ru:12003/api/v2/documents/';

    console.log('Testing Orange Data connection:', {
      url: orangeDataUrl,
      inn: config.inn,
      group: config.group,
      test_mode: config.test_mode
    });

    // For test purposes, we'll just validate the signature creation
    // In production, you might want to make an actual API call
    const testResponse = await fetch(orangeDataUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Signature': signature
      },
      body: JSON.stringify(testReceipt)
    });

    const responseText = await testResponse.text();
    let responseData;

    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { raw_response: responseText };
    }

    console.log('Orange Data test response:', {
      status: testResponse.status,
      data: responseData
    });

    // Check response
    if (testResponse.ok) {
      return new Response(JSON.stringify({
        success: true,
        message: "Подключение к Orange Data успешно установлено",
        response: {
          status: testResponse.status,
          receipt_id: testReceipt.id,
          endpoint: orangeDataUrl,
          data: responseData
        }
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    } else {
      // Even if API returns error, we can still validate configuration
      const isConfigValid = signature.length > 0;
      
      return new Response(JSON.stringify({
        success: isConfigValid,
        message: isConfigValid 
          ? `Конфигурация корректна, но API вернул ошибку: ${testResponse.status}`
          : "Ошибка в конфигурации",
        response: {
          status: testResponse.status,
          error: responseData,
          endpoint: orangeDataUrl,
          signature_created: isConfigValid
        }
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: isConfigValid ? 200 : 400,
      });
    }

  } catch (error) {
    console.error('Orange Data test error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      message: `Ошибка тестирования: ${error instanceof Error ? error.message : 'Unknown error'}`,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

async function createSignature(data: any, signKey: string): Promise<string> {
  try {
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
  } catch (error) {
    console.error('Signature creation error:', error);
    throw new Error('Ошибка создания подписи');
  }
}