import { useState, useEffect } from "react";
import Sidebar from "@/components/sidebar";
import MessageBroadcaster from "@/components/message-broadcaster";
import ActiveConnections from "@/components/active-connections";
import EventLogs from "@/components/event-logs";
import VideoChat from "@/components/video-chat";
import ServerSettings from "@/components/server-settings";
import ApiTests from "@/components/api-tests";
import { SSEClient, type SSEMessage } from "@/lib/sse";
import { useQuery } from "@tanstack/react-query";
import { Radio, Users, List, Video, Settings, TestTube2 } from "lucide-react";

export default function Dashboard() {
  const [sseClient, setSSEClient] = useState<SSEClient | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [recentMessages, setRecentMessages] = useState<SSEMessage[]>([]);
  const [activeTab, setActiveTab] = useState<string>("connections");

  // Fetch server stats
  const { data: stats, refetch: refetchStats } = useQuery({
    queryKey: ["/api/stats"],
    refetchInterval: 5000,
  });

  useEffect(() => {
    const client = new SSEClient(
      "/api/events",
      (message: SSEMessage) => {
        setRecentMessages((prev) => [message, ...prev].slice(0, 10));
        // Refetch stats when new messages arrive
        if (message.type !== "ping") {
          refetchStats();
        }
      },
      setIsConnected,
      (error) => {
        console.error("SSE Error:", error);
      },
    );

    client.connect();
    setSSEClient(client);

    return () => {
      client.disconnect();
    };
  }, [refetchStats]);

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar isConnected={isConnected} stats={stats as any} />

      <div className="flex-1 overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">
                Real-Time Communication
              </h2>
              <p className="text-slate-600">
                Monitor and test Server-Sent Events functionality
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-slate-500 flex items-center">
                <i className="fas fa-server mr-1"></i>
                https://a259bc05-bcad-4ed1-b27b-205541dbcf92-00-3hwv4mhdgys14.kirk.replit.dev/
              </div>
              <div
                className={`px-3 py-1 rounded-lg text-sm font-medium ${
                  isConnected
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {isConnected ? "Connected" : "Disconnected"}
              </div>
            </div>
          </div>
        </header>

        {/* Tab Navigation */}
        <div className="border-b border-slate-200 px-6">
          <nav className="flex space-x-8">
            {[
              { id: "connections", label: "Connections", icon: Users },
              { id: "broadcast", label: "Broadcasting", icon: Radio },
              { id: "logs", label: "Event Logs", icon: List },
              { id: "video", label: "Video Chat", icon: Video },
              { id: "tests", label: "API Tests", icon: TestTube2 },
              { id: "settings", label: "Settings", icon: Settings },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Dashboard Content */}
        <div className="p-6 h-full overflow-auto">
          {activeTab === "connections" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ActiveConnections />
              <MessageBroadcaster
                onMessageSent={() => refetchStats()}
                recentMessages={recentMessages}
              />
            </div>
          )}

          {activeTab === "broadcast" && (
            <div className="max-w-4xl mx-auto">
              <MessageBroadcaster
                onMessageSent={() => refetchStats()}
                recentMessages={recentMessages}
              />
            </div>
          )}

          {activeTab === "logs" && (
            <div className="max-w-6xl mx-auto">
              <EventLogs />
            </div>
          )}

          {activeTab === "video" && (
            <div className="max-w-4xl mx-auto">
              <VideoChat isConnected={isConnected} />
            </div>
          )}

          {activeTab === "tests" && (
            <div className="max-w-6xl mx-auto">
              <ApiTests />
            </div>
          )}

          {activeTab === "settings" && (
            <div className="max-w-4xl mx-auto">
              <ServerSettings isConnected={isConnected} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
