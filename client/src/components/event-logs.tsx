import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { List, Download, Trash2 } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function EventLogs() {
  const [logLevel, setLogLevel] = useState("All Events");
  const { toast } = useToast();

  const { data: logs, isLoading } = useQuery({
    queryKey: ['/api/logs', { level: logLevel }],
    refetchInterval: 3000,
  });

  const clearLogsMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('DELETE', '/api/logs');
    },
    onSuccess: () => {
      toast({
        title: "Logs cleared",
        description: "All event logs have been cleared successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/logs'] });
    },
    onError: (error) => {
      toast({
        title: "Clear failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const exportLogs = () => {
    if (!logs?.length) {
      toast({
        title: "No logs to export",
        description: "There are no logs available to export.",
        variant: "destructive",
      });
      return;
    }

    const logText = logs.map((log: any) => {
      const timestamp = new Date(log.timestamp).toLocaleString();
      return `[${timestamp}] [${log.level}] ${log.message}`;
    }).join('\n');

    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sse-logs-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Logs exported",
      description: "Event logs have been downloaded successfully.",
    });
  };

  const formatTimestamp = (timestamp: string | Date) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'INFO':
        return 'text-green-400';
      case 'CONN':
        return 'text-blue-400';
      case 'MSG':
        return 'text-purple-400';
      case 'WARN':
        return 'text-yellow-400';
      case 'ERROR':
        return 'text-red-400';
      default:
        return 'text-slate-400';
    }
  };

  if (isLoading) {
    return (
      <Card className="bg-white shadow-sm border border-slate-200">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-slate-200 rounded w-1/4"></div>
            <div className="h-64 bg-slate-200 rounded"></div>
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
            <List className="text-slate-600" size={20} />
            <span>Event Logs</span>
          </div>
          <div className="flex items-center space-x-2">
            <Select value={logLevel} onValueChange={setLogLevel}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All Events">All Events</SelectItem>
                <SelectItem value="INFO">INFO</SelectItem>
                <SelectItem value="CONN">Connections</SelectItem>
                <SelectItem value="MSG">Messages</SelectItem>
                <SelectItem value="WARN">Warnings</SelectItem>
                <SelectItem value="ERROR">Errors</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={exportLogs}
              disabled={!logs?.length}
            >
              <Download size={16} className="mr-1" />
              Export
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => clearLogsMutation.mutate()}
              disabled={clearLogsMutation.isPending || !logs?.length}
            >
              <Trash2 size={16} className="mr-1" />
              Clear
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="bg-slate-900 rounded-lg p-4 font-mono text-sm h-64 overflow-y-auto">
          {logs?.length ? (
            logs.map((log: any) => (
              <div key={log.id} className="mb-1 text-slate-300">
                <span className="text-slate-500">
                  [{formatTimestamp(log.timestamp)}]
                </span>{' '}
                <span className={getLevelColor(log.level)}>
                  [{log.level}]
                </span>{' '}
                <span>{log.message}</span>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-slate-500">
              <List size={48} className="mx-auto mb-2 text-slate-600" />
              <p>No logs available</p>
              {logLevel !== "All Events" && (
                <p className="text-sm mt-1">Try changing the filter level</p>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
