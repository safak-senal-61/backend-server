import { geminiTester, ApiTestRequest, ApiTestResult } from './gemini';

export class IntelligentApiTester {
  private baseUrl: string;
  private adminSecret: string;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private testResults: any[] = [];

  constructor(baseUrl: string = 'http://localhost:5000', adminSecret: string = '') {
    this.baseUrl = baseUrl;
    this.adminSecret = adminSecret;
  }

  async makeApiCall(request: ApiTestRequest): Promise<ApiTestResult> {
    try {
      const url = `${this.baseUrl}${request.endpoint}`;
      
      // Prepare headers
      const headers: any = {
        'Content-Type': 'application/json',
        ...request.headers
      };

      // Add auth headers if required
      if (request.requiresAuth && this.accessToken) {
        headers['Authorization'] = `Bearer ${this.accessToken}`;
      }

      // Add admin secret if required
      if (request.requiresAdminSecret && this.adminSecret) {
        headers['X-Admin-Secret'] = this.adminSecret;
      }

      const response = await fetch(url, {
        method: request.method,
        headers,
        body: request.body ? JSON.stringify(request.body) : undefined
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data,
          data: undefined
        };
      }

      // Store tokens if received
      if (data.accessToken) {
        this.accessToken = data.accessToken;
      }
      if (data.refreshToken) {
        this.refreshToken = data.refreshToken;
      }

      return {
        success: true,
        data,
        error: undefined
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        data: undefined
      };
    }
  }

  async testApiWithRetry(request: ApiTestRequest, maxAttempts: number = 3): Promise<ApiTestResult> {
    let lastError: any = null;
    let attemptCount = 0;

    for (let i = 0; i < maxAttempts; i++) {
      attemptCount++;
      console.log(`\n🔄 API Test Attempt ${attemptCount}: ${request.method} ${request.endpoint}`);

      const result = await this.makeApiCall(request);
      
      if (result.success) {
        console.log(`✅ API Test Success: ${request.endpoint}`);
        console.log(`Response:`, result.data);
        
        this.testResults.push({
          timestamp: new Date().toISOString(),
          endpoint: request.endpoint,
          method: request.method,
          attempt: attemptCount,
          success: true,
          data: result.data
        });
        
        return result;
      }

      lastError = result.error;
      console.log(`❌ API Test Failed (Attempt ${attemptCount}): ${request.endpoint}`);
      console.log(`Error:`, result.error);

      // Gemini ile hata analizi
      console.log(`🤖 Gemini ile hata analizi yapılıyor...`);
      const analysis = await geminiTester.analyzeApiError(result.error, request);
      console.log(`📊 Gemini Analysis:`, analysis);

      // Retry yapılıp yapılmayacağını kontrol et
      const shouldRetry = await geminiTester.shouldRetryTest(result.error, attemptCount);
      
      if (!shouldRetry || attemptCount >= maxAttempts) {
        console.log(`🚫 Retry yapılmayacak. Deneme sayısı: ${attemptCount}`);
        break;
      }

      // Gemini'den yeni test verileri al
      console.log(`🔄 Gemini'den yeni test verileri alınıyor...`);
      const newTestData = await geminiTester.generateTestData(
        request.endpoint.includes('register') ? 'register' : 
        request.endpoint.includes('login') ? 'login' : 'general',
        [String(result.error || 'API error')]
      );

      try {
        const testDataObj = JSON.parse(newTestData);
        if (testDataObj.testData) {
          request.body = { ...request.body, ...testDataObj.testData };
        }
        if (testDataObj.authHeaders) {
          request.headers = { ...request.headers, ...testDataObj.authHeaders };
        }
        console.log(`🔄 Test verileri güncellendi:`, request.body);
      } catch (parseError) {
        console.log(`⚠️  Test verileri parse edilemedi, orijinal verilerle devam...`);
      }

      // Kısa bekleme
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    this.testResults.push({
      timestamp: new Date().toISOString(),
      endpoint: request.endpoint,
      method: request.method,
      attempt: attemptCount,
      success: false,
      error: lastError
    });

    return {
      success: false,
      error: lastError,
      data: null
    };
  }

  async runCompleteApiTest(): Promise<void> {
    console.log(`\n🚀 Kapsamlı API Test Başlatılıyor...`);
    console.log(`Base URL: ${this.baseUrl}`);
    console.log(`Admin Secret: ${this.adminSecret ? '✅ Var' : '❌ Yok'}`);

    // Generate random test data
    const randomId = Math.floor(Math.random() * 10000);
    const timestamp = Date.now();
    const testUserData = {
      username: `testuser_${randomId}`,
      email: `test_${timestamp}@example.com`,
      password: 'TestPassword123!',
      firstName: 'Test',
      lastName: 'User'
    };

    console.log(`🎲 Rastgele test verileri oluşturuldu:`, testUserData);

    // 1. Register Test
    console.log(`\n📝 1. Register API Test`);
    const registerResult = await this.testApiWithRetry({
      endpoint: '/api/auth/register',
      method: 'POST',
      body: testUserData,
      requiresAuth: false,
      requiresAdminSecret: false
    });

    // 2. Login Test
    console.log(`\n🔐 2. Login API Test`);
    const loginResult = await this.testApiWithRetry({
      endpoint: '/api/auth/login',
      method: 'POST',
      body: {
        email: testUserData.email,
        password: testUserData.password
      },
      requiresAuth: false,
      requiresAdminSecret: false
    });

    // Extract token from login result
    if (loginResult.success && loginResult.data?.accessToken) {
      this.accessToken = loginResult.data.accessToken;
      console.log(`🔑 Login başarılı, access token alındı`);
    } else {
      console.log(`⚠️  Login başarısız, token alınamadı`);
    }

    // 3. Protected Route Test
    console.log(`\n🛡️  3. Protected Route Test`);
    const profileResult = await this.testApiWithRetry({
      endpoint: '/api/auth/profile',
      method: 'GET',
      requiresAuth: true,
      requiresAdminSecret: false
    });

    // 4. Admin Route Test
    console.log(`\n👑 4. Admin Route Test`);
    const adminResult = await this.testApiWithRetry({
      endpoint: '/api/admin/dashboard',
      method: 'GET',
      requiresAuth: true,
      requiresAdminSecret: true
    });

    // 5. Test Results Summary
    console.log(`\n📊 Test Sonuçları:`);
    console.log(`Total Tests: ${this.testResults.length}`);
    console.log(`Successful: ${this.testResults.filter(r => r.success).length}`);
    console.log(`Failed: ${this.testResults.filter(r => !r.success).length}`);
    
    this.testResults.forEach((result, index) => {
      const status = result.success ? '✅' : '❌';
      console.log(`${status} ${index + 1}. ${result.method} ${result.endpoint} (Attempt: ${result.attempt})`);
    });

    // 6. Store results to database
    try {
      await this.storeTestResults();
      console.log(`✅ Test sonuçları veritabanına kaydedildi`);
    } catch (error) {
      console.log(`❌ Test sonuçları kaydedilemedi:`, error);
    }
  }

  private async storeTestResults(): Promise<void> {
    // Create a summary message
    const summary = `API Test Completed - ${this.testResults.filter(r => r.success).length}/${this.testResults.length} tests passed`;
    
    // Store in event logs (reuse existing API endpoint)
    await this.makeApiCall({
      endpoint: '/api/broadcast',
      method: 'POST',
      body: {
        type: 'system',
        content: summary,
        metadata: JSON.stringify({
          testResults: this.testResults,
          timestamp: new Date().toISOString()
        })
      }
    });
  }

  getTestResults(): any[] {
    return this.testResults;
  }

  clearResults(): void {
    this.testResults = [];
  }
}