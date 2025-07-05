import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { insertMessageSchema, insertConnectionSchema, insertVideoRoomSchema, insertVideoParticipantSchema, insertServerSettingSchema } from "@shared/schema";
import { nanoid } from "nanoid";

interface SSEClient {
  id: string;
  response: Response;
  lastPing: Date;
}

const sseClients = new Map<string, SSEClient>();

// WebRTC Video Chat Storage
interface VideoRoom {
  roomId: string;
  hostId: string;
  participants: Set<string>;
  isActive: boolean;
}

interface WebRTCPeer {
  clientId: string;
  socket: WebSocket;
  isInVideoCall: boolean;
  currentRoomId?: string;
}

const videoRooms = new Map<string, VideoRoom>();
const webrtcPeers = new Map<string, WebRTCPeer>();

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Redirect to Swagger docs for API documentation
  app.get("/docs", (req: Request, res: Response) => {
    res.redirect("/api/docs");
  });
  
  // SSE endpoint for real-time communication
  app.get("/api/events", (req: Request, res: Response) => {
    const clientId = nanoid();
    const clientIp = req.ip || req.connection.remoteAddress || "unknown";
    
    // Set up SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });

    // Send initial connection message
    res.write(`data: ${JSON.stringify({ type: 'connection', clientId, message: 'Connected to SSE' })}\n\n`);

    // Store client connection
    const client: SSEClient = {
      id: clientId,
      response: res,
      lastPing: new Date()
    };
    sseClients.set(clientId, client);

    // Create connection record
    storage.createConnection({
      clientId,
      ipAddress: clientIp
    }).then(() => {
      // Log connection event
      storage.createEventLog({
        level: "CONN",
        message: `New client connected: ${clientIp}`,
        metadata: JSON.stringify({ clientId })
      });
    });

    // Handle client disconnect
    req.on('close', async () => {
      sseClients.delete(clientId);
      await storage.removeConnection(clientId);
      await storage.createEventLog({
        level: "CONN",
        message: `Client disconnected: ${clientIp}`,
        metadata: JSON.stringify({ clientId })
      });
    });

    // Keep connection alive with periodic pings
    const pingInterval = setInterval(() => {
      if (sseClients.has(clientId)) {
        res.write(`data: ${JSON.stringify({ type: 'ping', timestamp: new Date() })}\n\n`);
        client.lastPing = new Date();
        storage.updateConnection(clientId, { lastPing: new Date() });
      } else {
        clearInterval(pingInterval);
      }
    }, 30000); // Ping every 30 seconds
  });

  // API endpoint to broadcast messages
  app.post("/api/broadcast", async (req: Request, res: Response) => {
    try {
      const messageData = insertMessageSchema.parse(req.body);
      
      // Create message record
      const message = await storage.createMessage(messageData);
      
      // Broadcast to all connected clients
      const broadcastData = {
        type: messageData.type,
        content: messageData.content,
        timestamp: message.sentAt,
        id: message.id
      };

      let successCount = 0;
      const clientEntries = Array.from(sseClients.entries());
      
      for (const [clientId, client] of clientEntries) {
        try {
          client.response.write(`data: ${JSON.stringify(broadcastData)}\n\n`);
          successCount++;
          
          // Update message count for connection
          const connection = await storage.getConnection(clientId);
          if (connection) {
            await storage.updateConnection(clientId, {
              messageCount: connection.messageCount + 1
            });
          }
        } catch (error) {
          // Remove disconnected client
          sseClients.delete(clientId);
          await storage.removeConnection(clientId);
        }
      }

      // Log broadcast event
      await storage.createEventLog({
        level: "MSG",
        message: `Broadcasting message to ${successCount} clients`,
        metadata: JSON.stringify({ messageType: messageData.type, recipients: successCount })
      });

      res.json({ success: true, recipientCount: successCount, message });
    } catch (error) {
      await storage.createEventLog({
        level: "ERROR",
        message: `Failed to broadcast message: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
      res.status(400).json({ error: "Invalid message data" });
    }
  });

  // Get current connections
  app.get("/api/connections", async (req: Request, res: Response) => {
    try {
      const connections = await storage.getConnections();
      res.json(connections);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch connections" });
    }
  });

  // Get recent messages
  app.get("/api/messages", async (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const messages = await storage.getRecentMessages(limit);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  // Get event logs
  app.get("/api/logs", async (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const level = req.query.level as string;
      const logs = await storage.getEventLogs(limit, level);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch logs" });
    }
  });

  // Clear event logs
  app.delete("/api/logs", async (req: Request, res: Response) => {
    try {
      await storage.clearEventLogs();
      await storage.createEventLog({
        level: "INFO",
        message: "Event logs cleared by user"
      });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to clear logs" });
    }
  });

  // Disconnect a specific client
  app.delete("/api/connections/:clientId", async (req: Request, res: Response) => {
    try {
      const { clientId } = req.params;
      const client = sseClients.get(clientId);
      
      if (client) {
        client.response.end();
        sseClients.delete(clientId);
      }
      
      await storage.removeConnection(clientId);
      await storage.createEventLog({
        level: "CONN",
        message: `Client forcibly disconnected: ${clientId}`
      });
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to disconnect client" });
    }
  });

  // Get server stats
  app.get("/api/stats", async (req: Request, res: Response) => {
    try {
      const connections = await storage.getConnections();
      const messages = await storage.getRecentMessages(1000);
      
      // Calculate total video participants across all rooms
      let totalVideoParticipants = 0;
      videoRooms.forEach(room => {
        totalVideoParticipants += room.participants.size;
      });

      const stats = {
        activeConnections: sseClients.size,
        totalConnections: connections.length,
        messagesSent: messages.length,
        videoParticipants: totalVideoParticipants,
        activeVideoRooms: videoRooms.size,
        uptime: process.uptime()
      };
      
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  // === VIDEO CHAT ENDPOINTS ===
  
  // Video Room Management
  app.post("/api/video/rooms", async (req: Request, res: Response) => {
    try {
      const roomData = insertVideoRoomSchema.parse(req.body);
      const room = await storage.createVideoRoom(roomData);
      
      // Add to active rooms
      videoRooms.set(room.roomId, {
        roomId: room.roomId,
        hostId: room.hostId.toString(),
        participants: new Set(),
        isActive: true
      });

      await storage.createEventLog({
        level: "INFO",
        message: `Video room created: ${room.name}`,
        metadata: JSON.stringify({ roomId: room.roomId, hostId: room.hostId })
      });

      res.status(201).json(room);
    } catch (error) {
      res.status(400).json({ error: "Failed to create video room" });
    }
  });

  app.get("/api/video/rooms", async (req: Request, res: Response) => {
    try {
      const rooms = await storage.getActiveVideoRooms();
      res.json(rooms);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch video rooms" });
    }
  });

  app.post("/api/video/rooms/:roomId/join", async (req: Request, res: Response) => {
    try {
      const { roomId } = req.params;
      const { userId } = req.body;

      const participant = await storage.createVideoParticipant({
        roomId,
        userId: parseInt(userId)
      });

      // Add to active room
      const room = videoRooms.get(roomId);
      if (room) {
        room.participants.add(userId.toString());
      }

      // Broadcast to room participants
      broadcastToVideoRoom(roomId, {
        type: 'user_joined_video',
        userId,
        roomId,
        timestamp: new Date()
      });

      await storage.createEventLog({
        level: "INFO",
        message: `User joined video room: ${roomId}`,
        metadata: JSON.stringify({ userId, roomId })
      });

      res.json(participant);
    } catch (error) {
      res.status(400).json({ error: "Failed to join video room" });
    }
  });

  app.post("/api/video/rooms/:roomId/leave", async (req: Request, res: Response) => {
    try {
      const { roomId } = req.params;
      const { userId } = req.body;

      await storage.leaveVideoRoom(roomId, parseInt(userId));

      // Remove from active room
      const room = videoRooms.get(roomId);
      if (room) {
        room.participants.delete(userId.toString());
      }

      // Broadcast to room participants
      broadcastToVideoRoom(roomId, {
        type: 'user_left_video',
        userId,
        roomId,
        timestamp: new Date()
      });

      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: "Failed to leave video room" });
    }
  });

  // WebRTC Signaling
  app.post("/api/webrtc/signal", async (req: Request, res: Response) => {
    try {
      const { type, targetUserId, signal, roomId } = req.body;
      
      // Find target user's SSE connection
      const targetClient = Array.from(sseClients.values()).find(client => 
        client.id === targetUserId
      );

      if (targetClient) {
        targetClient.response.write(`data: ${JSON.stringify({
          type: 'webrtc_signal',
          signalType: type,
          signal: signal,
          fromUserId: req.body.fromUserId,
          roomId: roomId
        })}\n\n`);
      }

      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: "Failed to send WebRTC signal" });
    }
  });

  // === SERVER SETTINGS ===
  
  app.get("/api/settings", async (req: Request, res: Response) => {
    try {
      const settings = await storage.getServerSettings();
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  app.post("/api/settings", async (req: Request, res: Response) => {
    try {
      const settingData = insertServerSettingSchema.parse(req.body);
      const setting = await storage.updateServerSetting(settingData);
      
      await storage.createEventLog({
        level: "INFO",
        message: `Server setting updated: ${settingData.key}`,
        metadata: JSON.stringify({ key: settingData.key, value: settingData.value })
      });

      res.json(setting);
    } catch (error) {
      res.status(400).json({ error: "Failed to update setting" });
    }
  });

  // === ADVANCED CONNECTION MANAGEMENT ===
  
  app.get("/api/admin/dashboard", async (req: Request, res: Response) => {
    try {
      const [connections, messages, logs, videoRooms, settings] = await Promise.all([
        storage.getConnections(),
        storage.getRecentMessages(50),
        storage.getEventLogs(100),
        storage.getActiveVideoRooms(),
        storage.getServerSettings()
      ]);

      const adminData = {
        stats: {
          activeConnections: sseClients.size,
          totalConnections: connections.length,
          messagesSent: messages.length,
          activeVideoRooms: videoRooms.length,
          uptime: process.uptime()
        },
        recentConnections: connections.slice(0, 10),
        recentMessages: messages.slice(0, 10),
        recentLogs: logs.slice(0, 20),
        activeVideoRooms: videoRooms,
        serverSettings: settings
      };

      res.json(adminData);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch admin dashboard data" });
    }
  });

  // API Testing with Gemini AI
  app.post("/api/test/run-ai-tests", async (req: Request, res: Response) => {
    try {
      console.log(`🚀 Gemini AI API Test başlatılıyor...`);
      
      const { IntelligentApiTester } = await import('./services/api-tester');
      const tester = new IntelligentApiTester('http://localhost:5000', process.env.ADMIN_REGISTRATION_SECRET || '');
      
      // Run complete API test suite
      await tester.runCompleteApiTest();
      
      const results = tester.getTestResults();
      
      // Log to event system
      await storage.createEventLog({
        level: "INFO",
        message: `AI API Tests completed: ${results.filter((r: any) => r.success).length}/${results.length} tests passed`,
        metadata: JSON.stringify(results)
      });
      
      res.json({
        success: true,
        message: "AI API tests completed",
        results: results,
        summary: {
          total: results.length,
          passed: results.filter((r: any) => r.success).length,
          failed: results.filter((r: any) => !r.success).length
        }
      });
      
    } catch (error) {
      console.error('AI API Test hatası:', error);
      
      await storage.createEventLog({
        level: "ERROR",
        message: `AI API Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
      
      res.status(500).json({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get AI Test Results
  app.get("/api/test/results", async (req: Request, res: Response) => {
    try {
      const logs = await storage.getEventLogs(50, 'INFO');
      const testLogs = logs.filter(log => log.message.includes('AI API Tests') || log.message.includes('API Test'));
      
      res.json({
        recentTests: testLogs,
        totalTests: testLogs.length
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch test results" });
    }
  });

  // Helper Functions for Video Chat
  function broadcastToVideoRoom(roomId: string, message: any) {
    const room = videoRooms.get(roomId);
    if (!room) return;

    room.participants.forEach(userId => {
      const client = Array.from(sseClients.values()).find(c => c.id === userId);
      if (client) {
        client.response.write(`data: ${JSON.stringify(message)}\n\n`);
      }
    });
  }

  // Initialize server with some startup logs
  // TODO: Re-enable after database connection is fixed
  // storage.createEventLog({
  //   level: "INFO",
  //   message: "Advanced WebSocket server started successfully"
  // });

  const httpServer = createServer(app);
  
  // Create WebSocket server for video chat signaling
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  wss.on('connection', (ws: WebSocket, req) => {
    const clientId = nanoid();
    console.log(`WebSocket client connected: ${clientId}`);
    
    // Send welcome message
    ws.send(JSON.stringify({ 
      type: 'connection', 
      clientId, 
      message: 'WebSocket connected for video chat' 
    }));
    
    // Handle incoming WebSocket messages
    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        switch (message.type) {
          case 'join-room':
            await handleJoinVideoRoom(ws, clientId, message);
            break;
            
          case 'leave-room':
            await handleLeaveVideoRoom(ws, clientId, message);
            break;
            
          case 'webrtc-signal':
            await handleWebRTCSignal(ws, clientId, message);
            break;
            
          default:
            console.log('Unknown WebSocket message type:', message.type);
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    });
    
    // Handle WebSocket disconnection
    ws.on('close', () => {
      console.log(`WebSocket client disconnected: ${clientId}`);
      webrtcPeers.delete(clientId);
      
      // Remove client from any video rooms
      videoRooms.forEach((room, roomId) => {
        if (room.participants.has(clientId)) {
          room.participants.delete(clientId);
          
          // Notify other participants
          broadcastToVideoRoom(roomId, {
            type: 'participant-left',
            clientId,
            participantCount: room.participants.size
          });
          
          // Close room if empty
          if (room.participants.size === 0) {
            videoRooms.delete(roomId);
          }
        }
      });
    });
  });
  
  // WebSocket handler functions
  async function handleJoinVideoRoom(ws: WebSocket, clientId: string, message: any) {
    const { roomId } = message;
    
    if (!roomId) {
      ws.send(JSON.stringify({ type: 'error', message: 'Room ID is required' }));
      return;
    }
    
    // Add peer to WebRTC peers
    webrtcPeers.set(clientId, {
      clientId,
      socket: ws,
      isInVideoCall: true,
      currentRoomId: roomId
    });
    
    // Get or create video room
    let room = videoRooms.get(roomId);
    if (!room) {
      room = {
        roomId,
        hostId: clientId,
        participants: new Set(),
        isActive: true
      };
      videoRooms.set(roomId, room);
    }
    
    // Add participant to room
    room.participants.add(clientId);
    
    // Notify client they joined successfully
    ws.send(JSON.stringify({
      type: 'room-joined',
      roomId,
      participantCount: room.participants.size,
      isHost: room.hostId === clientId
    }));
    
    // Notify other participants
    broadcastToVideoRoomWebSocket(roomId, {
      type: 'participant-joined',
      clientId,
      roomId,
      participantCount: room.participants.size
    }, clientId);
  }
  
  async function handleLeaveVideoRoom(ws: WebSocket, clientId: string, message: any) {
    const peer = webrtcPeers.get(clientId);
    if (!peer || !peer.currentRoomId) return;
    
    const roomId = peer.currentRoomId;
    const room = videoRooms.get(roomId);
    
    if (room) {
      room.participants.delete(clientId);
      
      // Notify other participants
      broadcastToVideoRoomWebSocket(roomId, {
        type: 'participant-left',
        clientId,
        roomId,
        participantCount: room.participants.size
      });
      
      // Close room if empty
      if (room.participants.size === 0) {
        videoRooms.delete(roomId);
      }
    }
    
    // Remove peer
    webrtcPeers.delete(clientId);
    
    ws.send(JSON.stringify({ type: 'room-left', roomId }));
  }
  
  async function handleWebRTCSignal(ws: WebSocket, clientId: string, message: any) {
    const { targetClientId, signal, type: signalType } = message;
    const peer = webrtcPeers.get(clientId);
    
    if (!peer || !peer.currentRoomId) {
      ws.send(JSON.stringify({ type: 'error', message: 'Not in a video room' }));
      return;
    }
    
    // If targetClientId is specified, send to specific peer
    if (targetClientId) {
      const targetPeer = webrtcPeers.get(targetClientId);
      if (targetPeer && targetPeer.socket.readyState === WebSocket.OPEN) {
        targetPeer.socket.send(JSON.stringify({
          type: 'webrtc-signal',
          fromClientId: clientId,
          signalType,
          signal
        }));
      }
    } else {
      // Broadcast to all peers in the same room
      const room = videoRooms.get(peer.currentRoomId);
      if (room) {
        room.participants.forEach(participantId => {
          if (participantId !== clientId) {
            const targetPeer = webrtcPeers.get(participantId);
            if (targetPeer && targetPeer.socket.readyState === WebSocket.OPEN) {
              targetPeer.socket.send(JSON.stringify({
                type: 'webrtc-signal',
                fromClientId: clientId,
                signalType,
                signal
              }));
            }
          }
        });
      }
    }
  }
  
  function broadcastToVideoRoomWebSocket(roomId: string, message: any, excludeClientId?: string) {
    const room = videoRooms.get(roomId);
    if (!room) return;
    
    room.participants.forEach(participantId => {
      if (participantId !== excludeClientId) {
        const peer = webrtcPeers.get(participantId);
        if (peer && peer.socket.readyState === WebSocket.OPEN) {
          peer.socket.send(JSON.stringify(message));
        }
      }
    });
  }
  
  return httpServer;
}
