import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export interface ApiTestResult {
  success: boolean;
  error?: string;
  data?: any;
  suggestion?: string;
}

export interface ApiTestRequest {
  endpoint: string;
  method: string;
  body?: any;
  headers?: any;
  requiresAuth?: boolean;
  requiresAdminSecret?: boolean;
}

export class GeminiApiTester {
  private model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  async analyzeApiError(error: any, request: ApiTestRequest): Promise<string> {
    const prompt = `
API isteği başarısız oldu. Aşağıdaki bilgileri analiz et ve sorunu çözme önerisi sun:

API İsteği:
- Endpoint: ${request.endpoint}
- Method: ${request.method}
- Body: ${JSON.stringify(request.body, null, 2)}
- Headers: ${JSON.stringify(request.headers, null, 2)}
- Requires Auth: ${request.requiresAuth}
- Requires Admin Secret: ${request.requiresAdminSecret}

Hata:
${JSON.stringify(error, null, 2)}

Lütfen bu hatayı analiz et ve şunları öner:
1. Hatanın muhtemel nedeni
2. Sorunu çözmek için yapılması gerekenler
3. Yeni test verileri önerisi
4. Güvenlik gereksinimleri varsa nasıl karşılanacağı

Yanıtını JSON formatında ver:
{
  "analysis": "Hatanın analizi",
  "solution": "Çözüm önerisi",
  "newTestData": "Yeni test verileri",
  "securityNotes": "Güvenlik notları"
}
`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      return JSON.stringify({
        analysis: "Gemini API hatası",
        solution: "Manuel olarak kontrol edin",
        newTestData: "Test verilerini kontrol edin",
        securityNotes: "Güvenlik ayarlarını kontrol edin"
      });
    }
  }

  async generateTestData(apiType: string, previousErrors?: string[]): Promise<any> {
    const prompt = `
${apiType} API'si için test verileri oluştur. 

${previousErrors ? `Önceki hatalar: ${previousErrors.join(', ')}` : ''}

API türüne göre uygun test verileri oluştur:
- Register: username, email, password, firstName, lastName
- Login: email, password
- Auth Required: valid access token
- Admin Required: admin secret key

Yanıtını JSON formatında ver:
{
  "testData": "Test verileri object",
  "authHeaders": "Gerekli header'lar",
  "notes": "Önemli notlar"
}
`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      return {
        testData: {},
        authHeaders: {},
        notes: "Gemini API hatası"
      };
    }
  }

  async shouldRetryTest(error: any, attemptCount: number): Promise<boolean> {
    const prompt = `
API test ${attemptCount}. kez başarısız oldu. 

Hata: ${JSON.stringify(error, null, 2)}

Bu hatayı analiz et ve tekrar deneme yapılıp yapılmayacağını belirle. 
Maksimum 3 deneme yapılabilir.

Yanıtını JSON formatında ver:
{
  "shouldRetry": boolean,
  "reason": "Neden tekrar denenmeli/denenmemeli",
  "waitTime": "Kaç saniye beklenecek (retry varsa)"
}
`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const analysis = JSON.parse(response.text());
      return analysis.shouldRetry && attemptCount < 3;
    } catch (error) {
      return attemptCount < 3;
    }
  }
}

export const geminiTester = new GeminiApiTester();