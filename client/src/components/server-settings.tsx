import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Settings, Save, Plus, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface ServerSetting {
  id: number;
  key: string;
  value: string;
  description?: string;
  updatedAt: string;
}

interface ServerSettingsProps {
  isConnected: boolean;
}

export default function ServerSettings({ isConnected }: ServerSettingsProps) {
  const [settings, setSettings] = useState<ServerSetting[]>([]);
  const [loading, setLoading] = useState(false);
  const [newSetting, setNewSetting] = useState({
    key: "",
    value: "",
    description: ""
  });
  const [editingSetting, setEditingSetting] = useState<ServerSetting | null>(null);
  const { toast } = useToast();

  // Fetch server settings
  const fetchSettings = async () => {
    if (!isConnected) return;
    
    setLoading(true);
    try {
      const response = await fetch("/api/settings");
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      }
    } catch (error) {
      console.error("Failed to fetch settings:", error);
      toast({
        title: "Error",
        description: "Failed to fetch server settings",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, [isConnected]);

  // Save a setting (create or update)
  const saveSetting = async (settingData: { key: string; value: string; description?: string }) => {
    try {
      const response = await apiRequest("POST", "/api/settings", settingData);

      if (response.ok) {
        toast({
          title: "Success",
          description: "Setting saved successfully"
        });
        fetchSettings();
        setNewSetting({ key: "", value: "", description: "" });
        setEditingSetting(null);
      } else {
        throw new Error("Failed to save setting");
      }
    } catch (error) {
      console.error("Failed to save setting:", error);
      toast({
        title: "Error",
        description: "Failed to save setting",
        variant: "destructive"
      });
    }
  };

  // Handle new setting submission
  const handleAddSetting = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSetting.key || !newSetting.value) {
      toast({
        title: "Validation Error",
        description: "Key and value are required",
        variant: "destructive"
      });
      return;
    }
    saveSetting(newSetting);
  };

  // Handle editing existing setting
  const handleEditSetting = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSetting) return;
    
    saveSetting({
      key: editingSetting.key,
      value: editingSetting.value,
      description: editingSetting.description
    });
  };

  // Start editing a setting
  const startEditing = (setting: ServerSetting) => {
    setEditingSetting({ ...setting });
    setNewSetting({ key: "", value: "", description: "" });
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditingSetting(null);
  };

  // Common server settings
  const suggestedSettings = [
    { key: "max_connections", value: "1000", description: "Maximum number of concurrent connections" },
    { key: "message_rate_limit", value: "100", description: "Messages per minute per connection" },
    { key: "heartbeat_interval", value: "30", description: "Heartbeat interval in seconds" },
    { key: "auto_cleanup", value: "true", description: "Automatically cleanup inactive connections" },
    { key: "log_level", value: "INFO", description: "Server logging level" }
  ];

  if (!isConnected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Server Settings
          </CardTitle>
          <CardDescription>
            Connect to the server to manage settings
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Server Settings
          </span>
          <Button size="sm" variant="outline" onClick={fetchSettings} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </CardTitle>
        <CardDescription>
          Configure server behavior and limits
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Add New Setting Form */}
        <div className="border rounded-lg p-4">
          <h4 className="font-medium mb-3 flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add New Setting
          </h4>
          <form onSubmit={handleAddSetting} className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="setting-key">Key</Label>
                <Input
                  id="setting-key"
                  value={newSetting.key}
                  onChange={(e) => setNewSetting({ ...newSetting, key: e.target.value })}
                  placeholder="setting_key"
                />
              </div>
              <div>
                <Label htmlFor="setting-value">Value</Label>
                <Input
                  id="setting-value"
                  value={newSetting.value}
                  onChange={(e) => setNewSetting({ ...newSetting, value: e.target.value })}
                  placeholder="Setting value"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="setting-description">Description (Optional)</Label>
              <Textarea
                id="setting-description"
                value={newSetting.description}
                onChange={(e) => setNewSetting({ ...newSetting, description: e.target.value })}
                placeholder="Brief description of this setting"
                rows={2}
              />
            </div>
            <Button type="submit" size="sm">
              <Save className="h-4 w-4 mr-2" />
              Add Setting
            </Button>
          </form>

          {/* Suggested Settings */}
          <div className="mt-4">
            <h5 className="text-sm font-medium mb-2">Quick Add:</h5>
            <div className="flex flex-wrap gap-2">
              {suggestedSettings.map((setting) => (
                <Button
                  key={setting.key}
                  variant="outline"
                  size="sm"
                  onClick={() => setNewSetting(setting)}
                  className="text-xs"
                >
                  {setting.key}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Current Settings */}
        <div>
          <h4 className="font-medium mb-3">Current Settings ({settings.length})</h4>
          <div className="space-y-3">
            {settings.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No settings configured yet. Add some settings to get started!
              </div>
            ) : (
              settings.map((setting) => (
                <div
                  key={setting.id}
                  className="border rounded-lg p-4"
                >
                  {editingSetting?.id === setting.id ? (
                    /* Edit Form */
                    <form onSubmit={handleEditSetting} className="space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <Label>Key</Label>
                          <Input
                            value={editingSetting.key}
                            onChange={(e) => setEditingSetting({ ...editingSetting, key: e.target.value })}
                            disabled
                          />
                        </div>
                        <div>
                          <Label>Value</Label>
                          <Input
                            value={editingSetting.value}
                            onChange={(e) => setEditingSetting({ ...editingSetting, value: e.target.value })}
                          />
                        </div>
                      </div>
                      <div>
                        <Label>Description</Label>
                        <Textarea
                          value={editingSetting.description || ""}
                          onChange={(e) => setEditingSetting({ ...editingSetting, description: e.target.value })}
                          rows={2}
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button type="submit" size="sm">
                          <Save className="h-4 w-4 mr-2" />
                          Save
                        </Button>
                        <Button type="button" variant="outline" size="sm" onClick={cancelEditing}>
                          Cancel
                        </Button>
                      </div>
                    </form>
                  ) : (
                    /* Display Mode */
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="secondary" className="font-mono text-xs">
                            {setting.key}
                          </Badge>
                          <span className="text-sm font-medium">{setting.value}</span>
                        </div>
                        {setting.description && (
                          <p className="text-sm text-muted-foreground">{setting.description}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          Updated: {new Date(setting.updatedAt).toLocaleString()}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => startEditing(setting)}
                      >
                        Edit
                      </Button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}