import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Play, CheckCircle, XCircle, Clock, RefreshCw, TestTube2, Eye, Copy, Code, Database, Send } from "lucide-react";

interface TestResult {
  endpoint: string;
  method: string;
  status: number;
  success: boolean;
  responseTime: number;
  response?: any;
  error?: string;
  timestamp: Date;
  requestHeaders?: Record<string, string>;
  requestBody?: any;
  responseHeaders?: Record<string, string>;
  responseSize?: number;
}

interface EndpointTest {
  id: string;
  name: string;
  method: string;
  endpoint: string;
  description: string;
  expectedStatus: number;
  testData?: any;
  category: string;
}

// Random data generators
const generateRandomData = {
  username: () => `user_${Math.random().toString(36).substring(2, 8)}`,
  email: () => `test_${Math.random().toString(36).substring(2, 8)}@example.com`,
  password: () => `Pass${Math.random().toString(36).substring(2, 8)}!123`,
  firstName: () => {
    const names = ['Ahmet', 'Mehmet', 'Ayşe', 'Fatma', 'Ali', 'Veli', 'Zeynep', 'Elif'];
    return names[Math.floor(Math.random() * names.length)];
  },
  lastName: () => {
    const surnames = ['Yılmaz', 'Kaya', 'Demir', 'Çelik', 'Şahin', 'Özkan', 'Polat', 'Arslan'];
    return surnames[Math.floor(Math.random() * surnames.length)];
  },
  message: () => {
    const messages = [
      'Test mesajı - sistem kontrolü',
      'Otomatik test verisi',
      'API endpoint test mesajı',
      'Real-time iletişim testi',
      'WebSocket bağlantı kontrolü'
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  },
  roomName: () => `test_room_${Math.random().toString(36).substring(2, 6)}`,
  settingValue: () => Math.random() > 0.5 ? 'enabled' : 'disabled'
};

const generateTestData = (testId: string) => {
  switch (testId) {
    case 'auth-register':
      return {
        username: generateRandomData.username(),
        email: generateRandomData.email(),
        password: generateRandomData.password(),
        firstName: generateRandomData.firstName(),
        lastName: generateRandomData.lastName()
      };
    case 'auth-login':
      return {
        email: generateRandomData.email(),
        password: generateRandomData.password()
      };
    case 'broadcast-message':
      return {
        type: Math.random() > 0.5 ? 'notification' : 'alert',
        title: `Test ${Date.now()}`,
        content: generateRandomData.message()
      };
    case 'create-video-room':
      return {
        name: generateRandomData.roomName(),
        description: 'Otomatik oluşturulan test odası'
      };
    case 'update-setting':
      return {
        key: 'test_setting',
        value: generateRandomData.settingValue()
      };
    default:
      return {};
  }
};

const predefinedTests: EndpointTest[] = [
  // Authentication Tests
  {
    id: "auth-register",
    name: "User Registration",
    method: "POST",
    endpoint: "/api/auth/register",
    description: "Test user registration endpoint",
    expectedStatus: 201,
    testData: null, // Will be generated dynamically
    category: "Authentication"
  },
  {
    id: "auth-login",
    name: "User Login",
    method: "POST",
    endpoint: "/api/auth/login",
    description: "Test user login endpoint",
    expectedStatus: 200,
    testData: null, // Will be generated dynamically
    category: "Authentication"
  },
  // Connection Tests
  {
    id: "get-connections",
    name: "Get Active Connections",
    method: "GET",
    endpoint: "/api/connections",
    description: "Retrieve all active SSE connections",
    expectedStatus: 200,
    category: "Connections"
  },
  {
    id: "get-stats",
    name: "Get Server Stats",
    method: "GET",
    endpoint: "/api/stats",
    description: "Get real-time server statistics",
    expectedStatus: 200,
    category: "Server"
  },
  // Message Tests
  {
    id: "get-messages",
    name: "Get Recent Messages",
    method: "GET",
    endpoint: "/api/messages",
    description: "Retrieve recent broadcast messages",
    expectedStatus: 200,
    category: "Messages"
  },
  {
    id: "broadcast-message",
    name: "Broadcast Message",
    method: "POST",
    endpoint: "/api/broadcast",
    description: "Send a broadcast message to all clients",
    expectedStatus: 200,
    testData: null, // Will be generated dynamically
    category: "Messages"
  },
  // Video Tests
  {
    id: "get-video-rooms",
    name: "Get Video Rooms",
    method: "GET",
    endpoint: "/api/video/rooms",
    description: "Get all active video rooms",
    expectedStatus: 200,
    category: "Video"
  },
  // Settings Tests
  {
    id: "get-settings",
    name: "Get Server Settings",
    method: "GET",
    endpoint: "/api/settings",
    description: "Retrieve server configuration settings",
    expectedStatus: 200,
    category: "Settings"
  }
];

export default function ApiTests() {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [runningTests, setRunningTests] = useState<Set<string>>(new Set());
  const [customEndpoint, setCustomEndpoint] = useState("");
  const [customMethod, setCustomMethod] = useState("GET");
  const [customBody, setCustomBody] = useState("{}");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const runTest = async (test: EndpointTest) => {
    setRunningTests(prev => new Set(prev).add(test.id));
    const startTime = Date.now();

    try {
      // Generate fresh random data for each test
      const randomTestData = generateTestData(test.id);
      const finalTestData = Object.keys(randomTestData).length > 0 ? randomTestData : test.testData;

      const options: any = {
        method: test.method,
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "User-Agent": "API-Test-Client/1.0",
          "X-Test-ID": test.id,
          "X-Timestamp": new Date().toISOString(),
        },
      };
      
      if (finalTestData && (test.method === "POST" || test.method === "PUT" || test.method === "PATCH")) {
        options.body = JSON.stringify(finalTestData, null, 2);
      }

      const response = await fetch(test.endpoint, options);
      const responseTime = Date.now() - startTime;
      
      // Extract response headers
      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      let responseData;
      let responseSize = 0;
      
      try {
        const responseText = await response.text();
        responseSize = new Blob([responseText]).size;
        try {
          responseData = JSON.parse(responseText);
        } catch {
          responseData = responseText;
        }
      } catch {
        responseData = null;
      }

      const result: TestResult = {
        endpoint: test.endpoint,
        method: test.method,
        status: response.status,
        success: response.status === test.expectedStatus,
        responseTime,
        response: responseData,
        timestamp: new Date(),
        requestHeaders: options.headers,
        requestBody: finalTestData,
        responseHeaders,
        responseSize,
      };

      setTestResults(prev => [result, ...prev.slice(0, 49)]); // Keep last 50 results

      if (result.success) {
        toast({
          title: "✓ Test Başarılı",
          description: `${test.name} - ${responseTime}ms - ${(responseSize/1024).toFixed(1)}KB`,
        });
      } else {
        toast({
          title: "✗ Test Başarısız",
          description: `${test.name} - Expected ${test.expectedStatus}, got ${response.status}`,
          variant: "destructive",
        });
      }

    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      const result: TestResult = {
        endpoint: test.endpoint,
        method: test.method,
        status: 0,
        success: false,
        responseTime,
        error: error.message,
        timestamp: new Date(),
        requestHeaders: {
          "Content-Type": "application/json",
          "X-Test-ID": test.id,
        },
        requestBody: generateTestData(test.id),
      };

      setTestResults(prev => [result, ...prev.slice(0, 49)]);

      toast({
        title: "⚠ Test Hatası",
        description: `${test.name} - ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setRunningTests(prev => {
        const newSet = new Set(prev);
        newSet.delete(test.id);
        return newSet;
      });
    }
  };

  const runAllTests = async () => {
    for (const test of predefinedTests) {
      await runTest(test);
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  };

  const runCustomTest = async () => {
    if (!customEndpoint) {
      toast({
        title: "Hata",
        description: "Endpoint URL'si gerekli",
        variant: "destructive",
      });
      return;
    }

    const customTest: EndpointTest = {
      id: "custom",
      name: "Custom Test",
      method: customMethod,
      endpoint: customEndpoint,
      description: "Custom endpoint test",
      expectedStatus: 200,
      testData: customMethod !== "GET" ? JSON.parse(customBody || "{}") : undefined,
      category: "Custom"
    };

    await runTest(customTest);
  };

  const categories = [...new Set(predefinedTests.map(test => test.category))];
  const successRate = testResults.length > 0 
    ? (testResults.filter(r => r.success).length / testResults.length * 100).toFixed(1)
    : "0";

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <TestTube2 className="w-5 h-5 text-blue-600" />
            API Endpoint Testleri
          </h3>
          <p className="text-sm text-slate-600 mt-1">
            Tüm API endpoint'leri test edin ve sonuçları izleyin
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="grid grid-cols-4 gap-4 text-sm">
            <div className="text-center">
              <div className="font-semibold text-green-600">{successRate}%</div>
              <div className="text-xs text-slate-500">Başarı Oranı</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-blue-600">{testResults.length}</div>
              <div className="text-xs text-slate-500">Toplam Test</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-green-600">
                {testResults.filter(r => r.success).length}
              </div>
              <div className="text-xs text-slate-500">Başarılı</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-red-600">
                {testResults.filter(r => !r.success).length}
              </div>
              <div className="text-xs text-slate-500">Başarısız</div>
            </div>
          </div>
          <Button 
            onClick={runAllTests}
            disabled={runningTests.size > 0}
            className="flex items-center gap-2"
          >
            {runningTests.size > 0 ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            Tüm Testleri Çalıştır
          </Button>
        </div>
      </div>

      <Tabs defaultValue="tests" className="space-y-4">
        <TabsList>
          <TabsTrigger value="tests">Endpoint Testleri</TabsTrigger>
          <TabsTrigger value="custom">Özel Test</TabsTrigger>
          <TabsTrigger value="results">Test Sonuçları</TabsTrigger>
        </TabsList>

        <TabsContent value="tests" className="space-y-4">
          {categories.map(category => (
            <Card key={category}>
              <CardHeader>
                <CardTitle className="text-base">{category}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {predefinedTests
                  .filter(test => test.category === category)
                  .map(test => (
                    <div key={test.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs">
                            {test.method}
                          </Badge>
                          <span className="font-medium text-sm">{test.name}</span>
                        </div>
                        <p className="text-xs text-slate-600 mb-1">{test.description}</p>
                        <code className="text-xs text-slate-500">{test.endpoint}</code>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => runTest(test)}
                        disabled={runningTests.has(test.id)}
                        className="ml-4"
                      >
                        {runningTests.has(test.id) ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <Play className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  ))}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="custom" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Özel Endpoint Testi</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <Label>Method</Label>
                  <select 
                    value={customMethod} 
                    onChange={(e) => setCustomMethod(e.target.value)}
                    className="w-full p-2 border rounded-md text-sm"
                  >
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                    <option value="PUT">PUT</option>
                    <option value="PATCH">PATCH</option>
                    <option value="DELETE">DELETE</option>
                  </select>
                </div>
                <div className="col-span-3">
                  <Label>Endpoint URL</Label>
                  <Input
                    value={customEndpoint}
                    onChange={(e) => setCustomEndpoint(e.target.value)}
                    placeholder="/api/custom-endpoint"
                  />
                </div>
              </div>
              
              {customMethod !== "GET" && (
                <div>
                  <Label>Request Body (JSON)</Label>
                  <Textarea
                    value={customBody}
                    onChange={(e) => setCustomBody(e.target.value)}
                    placeholder='{"key": "value"}'
                    rows={4}
                  />
                </div>
              )}
              
              <Button onClick={runCustomTest} className="w-full">
                <Play className="w-4 h-4 mr-2" />
                Özel Testi Çalıştır
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="results" className="space-y-4">
          <div className="space-y-3">
            {testResults.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center text-slate-500">
                  <TestTube2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Henüz test sonucu yok. Testleri çalıştırın.</p>
                </CardContent>
              </Card>
            ) : (
              testResults.map((result, index) => (
                <Card key={index} className={`border-l-4 transition-all hover:shadow-md ${
                  result.success ? 'border-l-green-500 bg-green-50/30' : 'border-l-red-500 bg-red-50/30'
                }`}>
                  <CardContent className="p-6">
                    {/* Header with basic info */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        {result.success ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-600" />
                        )}
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs font-mono">
                            {result.method}
                          </Badge>
                          <code className="text-sm bg-slate-100 px-2 py-1 rounded">
                            {result.endpoint}
                          </code>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <Clock className="w-3 h-3" />
                          <span className="font-mono">{result.responseTime}ms</span>
                          {result.responseSize && (
                            <>
                              <span>•</span>
                              <Database className="w-3 h-3" />
                              <span className="font-mono">{(result.responseSize/1024).toFixed(1)}KB</span>
                            </>
                          )}
                        </div>
                        <div className="text-xs text-slate-400 mt-1">
                          {result.timestamp.toLocaleString('tr-TR')}
                        </div>
                      </div>
                    </div>
                    
                    {/* Status and error info */}
                    <div className="flex items-center gap-2 mb-4">
                      <Badge variant={result.success ? "default" : "destructive"} className="text-xs">
                        Status: {result.status || 'Network Error'}
                      </Badge>
                      {result.error && (
                        <Badge variant="outline" className="text-xs text-red-600 border-red-200">
                          Error: {result.error}
                        </Badge>
                      )}
                    </div>

                    {/* Detailed tabs for request/response */}
                    <Tabs defaultValue="response" className="w-full">
                      <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="response" className="text-xs">
                          <Code className="w-3 h-3 mr-1" />
                          Response
                        </TabsTrigger>
                        <TabsTrigger value="request" className="text-xs">
                          <Send className="w-3 h-3 mr-1" />
                          Request
                        </TabsTrigger>
                        <TabsTrigger value="headers" className="text-xs">
                          <Database className="w-3 h-3 mr-1" />
                          Headers
                        </TabsTrigger>
                      </TabsList>

                      <TabsContent value="response" className="mt-3">
                        {result.response ? (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-medium text-slate-600">Response Body</span>
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                className="h-6 px-2 text-xs"
                                onClick={() => navigator.clipboard?.writeText(JSON.stringify(result.response, null, 2))}
                              >
                                <Copy className="w-3 h-3 mr-1" />
                                Copy
                              </Button>
                            </div>
                            <pre className="text-xs bg-slate-900 text-green-400 p-3 rounded-lg overflow-auto max-h-40 font-mono border">
                              {typeof result.response === 'string' 
                                ? result.response 
                                : JSON.stringify(result.response, null, 2)}
                            </pre>
                          </div>
                        ) : (
                          <div className="text-center py-4 text-slate-500 text-xs">
                            No response data
                          </div>
                        )}
                      </TabsContent>

                      <TabsContent value="request" className="mt-3">
                        {result.requestBody ? (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-medium text-slate-600">Request Body</span>
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                className="h-6 px-2 text-xs"
                                onClick={() => navigator.clipboard?.writeText(JSON.stringify(result.requestBody, null, 2))}
                              >
                                <Copy className="w-3 h-3 mr-1" />
                                Copy
                              </Button>
                            </div>
                            <pre className="text-xs bg-slate-900 text-blue-400 p-3 rounded-lg overflow-auto max-h-40 font-mono border">
                              {JSON.stringify(result.requestBody, null, 2)}
                            </pre>
                          </div>
                        ) : (
                          <div className="text-center py-4 text-slate-500 text-xs">
                            No request body (GET request)
                          </div>
                        )}
                      </TabsContent>

                      <TabsContent value="headers" className="mt-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Request Headers */}
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-medium text-slate-600">Request Headers</span>
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                className="h-6 px-2 text-xs"
                                onClick={() => navigator.clipboard?.writeText(JSON.stringify(result.requestHeaders, null, 2))}
                              >
                                <Copy className="w-3 h-3 mr-1" />
                                Copy
                              </Button>
                            </div>
                            <div className="bg-slate-900 text-orange-400 p-3 rounded-lg text-xs font-mono max-h-32 overflow-auto border">
                              {result.requestHeaders ? (
                                Object.entries(result.requestHeaders).map(([key, value]) => (
                                  <div key={key} className="flex justify-between py-1 border-b border-slate-700 last:border-b-0">
                                    <span className="text-orange-300">{key}:</span>
                                    <span className="text-orange-400 ml-2">{value}</span>
                                  </div>
                                ))
                              ) : (
                                <div className="text-slate-500">No headers</div>
                              )}
                            </div>
                          </div>

                          {/* Response Headers */}
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-medium text-slate-600">Response Headers</span>
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                className="h-6 px-2 text-xs"
                                onClick={() => navigator.clipboard?.writeText(JSON.stringify(result.responseHeaders, null, 2))}
                              >
                                <Copy className="w-3 h-3 mr-1" />
                                Copy
                              </Button>
                            </div>
                            <div className="bg-slate-900 text-purple-400 p-3 rounded-lg text-xs font-mono max-h-32 overflow-auto border">
                              {result.responseHeaders ? (
                                Object.entries(result.responseHeaders).map(([key, value]) => (
                                  <div key={key} className="flex justify-between py-1 border-b border-slate-700 last:border-b-0">
                                    <span className="text-purple-300">{key}:</span>
                                    <span className="text-purple-400 ml-2">{value}</span>
                                  </div>
                                ))
                              ) : (
                                <div className="text-slate-500">No headers</div>
                              )}
                            </div>
                          </div>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}