import { Radio, Users, List, Settings, Activity, Book, Brain } from "lucide-react";
import { Link } from "wouter";

interface SidebarProps {
  isConnected: boolean;
  stats?: {
    activeConnections: number;
    messagesSent: number;
    videoParticipants: number;
    activeVideoRooms: number;
    uptime: number;
  };
}

export default function Sidebar({ isConnected, stats }: SidebarProps) {
  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="w-64 bg-white shadow-lg border-r border-slate-200">
      <div className="p-6">
        <div className="flex items-center space-x-3 mb-8">
          <Radio className="text-2xl text-blue-600" size={32} />
          <div>
            <h1 className="text-xl font-bold text-slate-900">SSE Server</h1>
            <p className="text-sm text-slate-500">Real-time Dashboard</p>
          </div>
        </div>

        {/* Server Status */}
        <div className="mb-6">
          <div
            className={`flex items-center justify-between p-3 rounded-lg border ${
              isConnected
                ? "bg-green-50 border-green-200"
                : "bg-red-50 border-red-200"
            }`}
          >
            <div className="flex items-center space-x-2">
              <div
                className={`w-3 h-3 rounded-full ${
                  isConnected ? "bg-green-500 animate-pulse" : "bg-red-500"
                }`}
              ></div>
              <span
                className={`text-sm font-medium ${
                  isConnected ? "text-green-800" : "text-red-800"
                }`}
              >
                {isConnected ? "Server Online" : "Server Offline"}
              </span>
            </div>
            {stats && (
              <span
                className={`text-xs ${
                  isConnected ? "text-green-600" : "text-red-600"
                }`}
              >
                {formatUptime(stats.uptime)}
              </span>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="space-y-2">
          <a
            href="#"
            className="flex items-center space-x-3 px-3 py-2 text-blue-600 bg-blue-50 rounded-lg border border-blue-200"
          >
            <Activity size={16} />
            <span className="font-medium">Dashboard</span>
          </a>
          <a
            href="#"
            className="flex items-center space-x-3 px-3 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
          >
            <Users size={16} />
            <span>Connections</span>
          </a>
          <a
            href="#"
            className="flex items-center space-x-3 px-3 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
          >
            <List size={16} />
            <span>Event Logs</span>
          </a>
          <Link
            href="/api-test"
            className="flex items-center space-x-3 px-3 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
          >
            <Brain size={16} />
            <span>Gemini AI Test</span>
          </Link>
          <a
            href="#"
            className="flex items-center space-x-3 px-3 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
          >
            <Settings size={16} />
            <span>Settings</span>
          </a>
          <a
            href="http://localhost:3001/api/docs"
            target="_blank"
            className="flex items-center space-x-3 px-3 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
          >
            <Book size={16} />
            <span>API Docs</span>
          </a>
        </nav>
      </div>

      {/* Connection Stats */}
      <div className="px-6 py-4 border-t border-slate-200">
        <div className="text-xs text-slate-500 mb-2">Quick Stats</div>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-slate-600">Active Connections</span>
            <span className="text-sm font-medium text-slate-900">
              {stats?.activeConnections || 0}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-slate-600">Messages Sent</span>
            <span className="text-sm font-medium text-slate-900">
              {stats?.messagesSent || 0}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-slate-600">Video Participants</span>
            <span className="text-sm font-medium text-slate-900">
              {stats?.videoParticipants || 0}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-slate-600">Video Rooms</span>
            <span className="text-sm font-medium text-slate-900">
              {stats?.activeVideoRooms || 0}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
