import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Send, Radio, Shuffle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { SSEMessage } from "@/lib/sse";

interface MessageBroadcasterProps {
  onMessageSent: () => void;
  recentMessages: SSEMessage[];
}

export default function MessageBroadcaster({ onMessageSent, recentMessages }: MessageBroadcasterProps) {
  const [messageType, setMessageType] = useState("notification");
  const [messageContent, setMessageContent] = useState("");
  const { toast } = useToast();

  const { data: recentBroadcasts } = useQuery({
    queryKey: ['/api/messages'],
    refetchInterval: 5000,
  });

  const broadcastMutation = useMutation({
    mutationFn: async (data: { type: string; content: string }) => {
      return apiRequest('POST', '/api/broadcast', data);
    },
    onSuccess: () => {
      setMessageContent("");
      toast({
        title: "Message broadcasted",
        description: "Your message has been sent to all connected clients.",
      });
      onMessageSent();
      queryClient.invalidateQueries({ queryKey: ['/api/messages'] });
    },
    onError: (error) => {
      toast({
        title: "Broadcast failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageContent.trim()) {
      toast({
        title: "Message required",
        description: "Please enter a message to broadcast.",
        variant: "destructive",
      });
      return;
    }
    broadcastMutation.mutate({ type: messageType, content: messageContent });
  };

  const sendRandomMessage = () => {
    const messages = [
      "System update completed successfully",
      "New user registration detected",
      "Server performance optimized",
      "Database backup completed",
      "Security scan finished - no issues found"
    ];
    const types = ["notification", "update", "alert", "system"];
    const randomMessage = messages[Math.floor(Math.random() * messages.length)];
    const randomType = types[Math.floor(Math.random() * types.length)];
    
    broadcastMutation.mutate({ type: randomType, content: randomMessage });
  };

  const formatTimestamp = (timestamp: string | Date) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m ago`;
  };

  return (
    <Card className="bg-white shadow-sm border border-slate-200">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Radio className="text-blue-600" size={20} />
          <span>Message Broadcaster</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="messageType" className="text-sm font-medium text-slate-700">
              Message Type
            </Label>
            <Select value={messageType} onValueChange={setMessageType}>
              <SelectTrigger className="w-full mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="notification">notification</SelectItem>
                <SelectItem value="update">update</SelectItem>
                <SelectItem value="alert">alert</SelectItem>
                <SelectItem value="system">system</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="messageContent" className="text-sm font-medium text-slate-700">
              Message Content
            </Label>
            <Textarea 
              id="messageContent"
              className="w-full mt-2 h-24 resize-none"
              placeholder="Enter your message here..."
              value={messageContent}
              onChange={(e) => setMessageContent(e.target.value)}
            />
          </div>
          
          <div className="flex items-center space-x-4">
            <Button 
              type="submit"
              className="bg-blue-600 hover:bg-blue-700"
              disabled={broadcastMutation.isPending}
            >
              <Send size={16} className="mr-2" />
              {broadcastMutation.isPending ? "Broadcasting..." : "Broadcast Message"}
            </Button>
            <Button 
              type="button"
              variant="secondary"
              onClick={sendRandomMessage}
              disabled={broadcastMutation.isPending}
            >
              <Shuffle size={16} className="mr-2" />
              Send Random
            </Button>
          </div>
        </form>

        {/* Recent Messages */}
        <div className="mt-6">
          <h4 className="text-sm font-medium text-slate-700 mb-3">Recent Broadcasts</h4>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {recentBroadcasts?.length ? (
              recentBroadcasts.map((message: any) => (
                <div key={message.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-medium ${
                      message.type === 'notification' ? 'text-blue-600' :
                      message.type === 'update' ? 'text-green-600' :
                      message.type === 'alert' ? 'text-red-600' :
                      'text-purple-600'
                    }`}>
                      {message.type}
                    </span>
                    <span className="text-xs text-slate-500">
                      {formatTimestamp(message.sentAt)}
                    </span>
                  </div>
                  <p className="text-sm text-slate-700">{message.content}</p>
                </div>
              ))
            ) : (
              <div className="text-center py-4 text-slate-500 text-sm">
                No messages sent yet
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
