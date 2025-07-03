import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ActiveConnections() {
  const { toast } = useToast();

  const { data: connections, isLoading } = useQuery({
    queryKey: ['/api/connections'],
    refetchInterval: 2000,
  });

  const disconnectMutation = useMutation({
    mutationFn: async (clientId: string) => {
      return apiRequest('DELETE', `/api/connections/${clientId}`);
    },
    onSuccess: () => {
      toast({
        title: "Client disconnected",
        description: "The client has been disconnected successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/connections'] });
    },
    onError: (error) => {
      toast({
        title: "Disconnect failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const formatTimestamp = (timestamp: string | Date) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
        return 'bg-green-500';
      case 'reconnecting':
        return 'bg-yellow-500';
      default:
        return 'bg-red-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'connected':
        return 'Connected';
      case 'reconnecting':
        return 'Reconnecting';
      default:
        return 'Disconnected';
    }
  };

  if (isLoading) {
    return (
      <Card className="bg-white shadow-sm border border-slate-200">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-slate-200 rounded w-1/3"></div>
            <div className="space-y-2">
              <div className="h-12 bg-slate-200 rounded"></div>
              <div className="h-12 bg-slate-200 rounded"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white shadow-sm border border-slate-200">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Users className="text-green-600" size={20} />
            <span>Active Connections</span>
          </div>
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            {connections?.length || 0} Connected
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {connections?.length ? (
            connections.map((connection: any) => (
              <div 
                key={connection.id} 
                className="p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${getStatusColor(connection.status)}`}></div>
                    <div>
                      <div className="font-medium text-slate-900">
                        Client #{connection.id}
                      </div>
                      <div className="text-sm text-slate-500">
                        {connection.ipAddress}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm font-medium ${
                      connection.status === 'connected' ? 'text-slate-900' :
                      connection.status === 'reconnecting' ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>
                      {getStatusText(connection.status)}
                    </div>
                    <div className="text-xs text-slate-500">
                      {formatTimestamp(connection.connectedAt)}
                    </div>
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <div className="text-xs text-slate-500">
                    <span>Messages: {connection.messageCount}</span>
                    <span className="ml-3">
                      Last Ping: {formatTimestamp(connection.lastPing)}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-red-600 hover:text-red-800 hover:bg-red-50"
                    onClick={() => disconnectMutation.mutate(connection.clientId)}
                    disabled={disconnectMutation.isPending}
                  >
                    <X size={12} className="mr-1" />
                    Disconnect
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-slate-500">
              <Users size={48} className="mx-auto mb-2 text-slate-300" />
              <p className="text-sm">No active connections</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
