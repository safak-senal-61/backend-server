import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Play, Brain, CheckCircle, XCircle, Clock, RefreshCw } from 'lucide-react';

interface TestResult {
  timestamp: string;
  endpoint: string;
  method: string;
  attempt: number;
  success: boolean;
  data?: any;
  error?: string;
}

interface TestSummary {
  total: number;
  passed: number;
  failed: number;
}

interface ApiTestResponse {
  success: boolean;
  message: string;
  results: TestResult[];
  summary: TestSummary;
  error?: string;
}

export default function ApiTestPage() {
  const [isRunning, setIsRunning] = useState(false);
  const [lastResults, setLastResults] = useState<TestResult[]>([]);
  const queryClient = useQueryClient();

  // API test çalıştırma mutation
  const runTestsMutation = useMutation({
    mutationFn: async (): Promise<ApiTestResponse> => {
      const response = await fetch('/api/test/run-ai-tests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Test failed');
      }
      
      return response.json();
    },
    onMutate: () => {
      setIsRunning(true);
    },
    onSuccess: (data) => {
      setLastResults(data.results);
      setIsRunning(false);
      queryClient.invalidateQueries({ queryKey: ['/api/test/results'] });
      queryClient.invalidateQueries({ queryKey: ['/api/logs'] });
    },
    onError: () => {
      setIsRunning(false);
    },
  });

  // Test geçmişini getir
  const { data: testHistory } = useQuery({
    queryKey: ['/api/test/results'],
    refetchInterval: 5000,
  }) as { data: { recentTests?: any[] } | undefined };

  const runTests = () => {
    runTestsMutation.mutate();
  };

  const getStatusIcon = (success: boolean) => {
    return success ? (
      <CheckCircle className="h-5 w-5 text-green-500" />
    ) : (
      <XCircle className="h-5 w-5 text-red-500" />
    );
  };

  const getMethodBadgeColor = (method: string) => {
    switch (method) {
      case 'GET': return 'bg-green-100 text-green-800';
      case 'POST': return 'bg-blue-100 text-blue-800';
      case 'PUT': return 'bg-yellow-100 text-yellow-800';
      case 'DELETE': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Gemini AI API Testleri</h1>
            <p className="text-gray-600 mt-2">
              Yapay zeka destekli akıllı API test sistemi
            </p>
          </div>
          
          <Button 
            onClick={runTests} 
            disabled={isRunning}
            size="lg"
            className="gap-2"
          >
            {isRunning ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Test Çalışıyor...
              </>
            ) : (
              <>
                <Brain className="h-4 w-4" />
                AI Test Başlat
              </>
            )}
          </Button>
        </div>

        {/* Test Özeti */}
        {lastResults.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Play className="h-5 w-5" />
                Son Test Sonuçları
              </CardTitle>
              <CardDescription>
                Gemini AI tarafından gerçekleştirilen test sonuçları
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {lastResults.length}
                  </div>
                  <div className="text-sm text-gray-600">Toplam Test</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {lastResults.filter(r => r.success).length}
                  </div>
                  <div className="text-sm text-gray-600">Başarılı</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {lastResults.filter(r => !r.success).length}
                  </div>
                  <div className="text-sm text-gray-600">Başarısız</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Hata Mesajı */}
        {runTestsMutation.error && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              Test Hatası: {runTestsMutation.error.message}
            </AlertDescription>
          </Alert>
        )}

        {/* Test Sonuçları Detayları */}
        {lastResults.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Test Detayları</CardTitle>
              <CardDescription>
                Her bir API endpoint'inin test sonuçları
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {lastResults.map((result, index) => (
                  <div 
                    key={index} 
                    className="flex items-center justify-between p-4 border rounded-lg bg-white"
                  >
                    <div className="flex items-center gap-3">
                      {getStatusIcon(result.success)}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getMethodBadgeColor(result.method)}`}>
                            {result.method}
                          </span>
                          <span className="font-mono text-sm">{result.endpoint}</span>
                        </div>
                        <div className="text-sm text-gray-500 mt-1">
                          Deneme: {result.attempt} | {new Date(result.timestamp).toLocaleTimeString('tr-TR')}
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      {result.success ? (
                        <Badge variant="outline" className="text-green-600 border-green-600">
                          Başarılı
                        </Badge>
                      ) : (
                        <Badge variant="destructive">
                          Başarısız
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Test başlamamış ise yönlendirme */}
        {lastResults.length === 0 && !isRunning && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                AI Test Sistemi Hazır
              </CardTitle>
              <CardDescription>
                Gemini AI ile akıllı API testleri yapmak için yukarıdaki butona tıklayın
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-6">
                <div className="text-lg font-medium text-gray-700 mb-2">
                  Test edilecek API'ler:
                </div>
                <div className="space-y-2 text-sm text-gray-600">
                  <div>• Register API (Kullanıcı kaydı)</div>
                  <div>• Login API (Giriş)</div>
                  <div>• Profile API (Korumalı endpoint)</div>
                  <div>• Admin API (Admin endpoint)</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Sistem Bilgisi */}
        <Card>
          <CardHeader>
            <CardTitle>Sistem Bilgisi</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">AI Motoru:</span> Gemini 1.5 Flash
              </div>
              <div>
                <span className="font-medium">Test URL:</span> http://localhost:5000
              </div>
              <div>
                <span className="font-medium">Admin Secret:</span> ✅ Ayarlandı
              </div>
              <div>
                <span className="font-medium">Otomatik Retry:</span> ✅ Aktif (Max 3 deneme)
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}