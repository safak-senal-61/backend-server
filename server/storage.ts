import { users, connections, messages, eventLogs, videoRooms, videoParticipants, serverSettings, refreshTokens, type User, type InsertUser, type Connection, type InsertConnection, type Message, type InsertMessage, type EventLog, type InsertEventLog, type VideoRoom, type InsertVideoRoom, type VideoParticipant, type InsertVideoParticipant, type ServerSetting, type InsertServerSetting, type RefreshToken, type InsertRefreshToken } from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserLastLogin(userId: number): Promise<void>;
  
  // Connection methods
  getConnections(): Promise<Connection[]>;
  getConnection(clientId: string): Promise<Connection | undefined>;
  createConnection(connection: InsertConnection): Promise<Connection>;
  updateConnection(clientId: string, updates: Partial<Connection>): Promise<Connection | undefined>;
  removeConnection(clientId: string): Promise<void>;
  
  // Message methods
  getRecentMessages(limit?: number): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  
  // Event log methods
  getEventLogs(limit?: number, level?: string): Promise<EventLog[]>;
  createEventLog(log: InsertEventLog): Promise<EventLog>;
  clearEventLogs(): Promise<void>;
  
  // Video Room methods
  createVideoRoom(room: InsertVideoRoom): Promise<VideoRoom>;
  getActiveVideoRooms(): Promise<VideoRoom[]>;
  endVideoRoom(roomId: string): Promise<void>;
  
  // Video Participant methods
  createVideoParticipant(participant: InsertVideoParticipant): Promise<VideoParticipant>;
  leaveVideoRoom(roomId: string, userId: number): Promise<void>;
  getVideoRoomParticipants(roomId: string): Promise<VideoParticipant[]>;
  
  // Server Settings methods
  getServerSettings(): Promise<ServerSetting[]>;
  updateServerSetting(setting: InsertServerSetting): Promise<ServerSetting>;
  getServerSetting(key: string): Promise<ServerSetting | undefined>;
  
  // Auth / Refresh Token methods
  getRefreshToken(token: string): Promise<any | undefined>;
  createRefreshToken(tokenData: any): Promise<any>;
  revokeRefreshToken(token: string): Promise<void>;
  revokeAllUserTokens(userId: number): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private connections: Map<string, Connection>;
  private messages: Message[];
  private logs: EventLog[];
  private currentUserId: number;
  private currentConnectionId: number;
  private currentMessageId: number;
  private currentLogId: number;

  constructor() {
    this.users = new Map();
    this.connections = new Map();
    this.messages = [];
    this.logs = [];
    this.currentUserId = 1;
    this.currentConnectionId = 1;
    this.currentMessageId = 1;
    this.currentLogId = 1;
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Connection methods
  async getConnections(): Promise<Connection[]> {
    return Array.from(this.connections.values()).sort((a, b) => 
      new Date(b.connectedAt).getTime() - new Date(a.connectedAt).getTime()
    );
  }

  async getConnection(clientId: string): Promise<Connection | undefined> {
    return this.connections.get(clientId);
  }

  async createConnection(insertConnection: InsertConnection): Promise<Connection> {
    const id = this.currentConnectionId++;
    const now = new Date();
    const connection: Connection = {
      id,
      ...insertConnection,
      connectedAt: now,
      lastPing: now,
      messageCount: 0,
      status: "connected"
    };
    this.connections.set(connection.clientId, connection);
    return connection;
  }

  async updateConnection(clientId: string, updates: Partial<Connection>): Promise<Connection | undefined> {
    const connection = this.connections.get(clientId);
    if (!connection) return undefined;
    
    const updatedConnection = { ...connection, ...updates };
    this.connections.set(clientId, updatedConnection);
    return updatedConnection;
  }

  async removeConnection(clientId: string): Promise<void> {
    this.connections.delete(clientId);
  }

  // Message methods
  async getRecentMessages(limit: number = 10): Promise<Message[]> {
    return this.messages
      .sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime())
      .slice(0, limit);
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const id = this.currentMessageId++;
    const message: Message = {
      id,
      ...insertMessage,
      sentAt: new Date(),
      recipientCount: this.connections.size
    };
    this.messages.push(message);
    return message;
  }

  // Event log methods
  async getEventLogs(limit: number = 50, level?: string): Promise<EventLog[]> {
    let logs = this.logs;
    if (level && level !== "All Events") {
      logs = logs.filter(log => log.level === level);
    }
    return logs
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  async createEventLog(insertLog: InsertEventLog): Promise<EventLog> {
    const id = this.currentLogId++;
    const log: EventLog = {
      id,
      ...insertLog,
      timestamp: new Date()
    };
    this.logs.push(log);
    return log;
  }

  async clearEventLogs(): Promise<void> {
    this.logs = [];
  }
}

// Database Storage Implementation
export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async updateUserLastLogin(userId: number): Promise<void> {
    await db
      .update(users)
      .set({ lastLoginAt: new Date() })
      .where(eq(users.id, userId));
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async getConnections(): Promise<Connection[]> {
    return await db.select().from(connections).orderBy(connections.connectedAt);
  }

  async getConnection(clientId: string): Promise<Connection | undefined> {
    const [connection] = await db.select().from(connections).where(eq(connections.clientId, clientId));
    return connection || undefined;
  }

  async createConnection(insertConnection: InsertConnection): Promise<Connection> {
    const [connection] = await db
      .insert(connections)
      .values(insertConnection)
      .returning();
    return connection;
  }

  async updateConnection(clientId: string, updates: Partial<Connection>): Promise<Connection | undefined> {
    const [connection] = await db
      .update(connections)
      .set(updates)
      .where(eq(connections.clientId, clientId))
      .returning();
    return connection || undefined;
  }

  async removeConnection(clientId: string): Promise<void> {
    await db.delete(connections).where(eq(connections.clientId, clientId));
  }

  async getRecentMessages(limit: number = 10): Promise<Message[]> {
    return await db.select().from(messages).orderBy(messages.sentAt).limit(limit);
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const [message] = await db
      .insert(messages)
      .values(insertMessage)
      .returning();
    return message;
  }

  async getEventLogs(limit: number = 50, level?: string): Promise<EventLog[]> {
    let query = db.select().from(eventLogs);
    
    if (level && level !== "All Events") {
      query = query.where(eq(eventLogs.level, level));
    }
    
    return await query.orderBy(eventLogs.timestamp).limit(limit);
  }

  async createEventLog(insertLog: InsertEventLog): Promise<EventLog> {
    const [log] = await db
      .insert(eventLogs)
      .values({
        ...insertLog,
        metadata: insertLog.metadata || null
      })
      .returning();
    return log;
  }

  async clearEventLogs(): Promise<void> {
    await db.delete(eventLogs);
  }

  // Video Room methods
  async createVideoRoom(insertRoom: InsertVideoRoom): Promise<VideoRoom> {
    const [room] = await db
      .insert(videoRooms)
      .values(insertRoom)
      .returning();
    return room;
  }

  async getActiveVideoRooms(): Promise<VideoRoom[]> {
    return await db.select().from(videoRooms).where(eq(videoRooms.isActive, true));
  }

  async endVideoRoom(roomId: string): Promise<void> {
    await db
      .update(videoRooms)
      .set({ isActive: false, endedAt: new Date() })
      .where(eq(videoRooms.roomId, roomId));
  }

  // Video Participant methods
  async createVideoParticipant(insertParticipant: InsertVideoParticipant): Promise<VideoParticipant> {
    const [participant] = await db
      .insert(videoParticipants)
      .values(insertParticipant)
      .returning();
    return participant;
  }

  async leaveVideoRoom(roomId: string, userId: number): Promise<void> {
    await db
      .update(videoParticipants)
      .set({ isActive: false, leftAt: new Date() })
      .where(eq(videoParticipants.roomId, roomId))
      .where(eq(videoParticipants.userId, userId));
  }

  async getVideoRoomParticipants(roomId: string): Promise<VideoParticipant[]> {
    return await db.select().from(videoParticipants)
      .where(eq(videoParticipants.roomId, roomId))
      .where(eq(videoParticipants.isActive, true));
  }

  // Server Settings methods
  async getServerSettings(): Promise<ServerSetting[]> {
    return await db.select().from(serverSettings).orderBy(serverSettings.key);
  }

  async updateServerSetting(insertSetting: InsertServerSetting): Promise<ServerSetting> {
    const [existing] = await db.select().from(serverSettings)
      .where(eq(serverSettings.key, insertSetting.key));

    if (existing) {
      const [updated] = await db
        .update(serverSettings)
        .set({ 
          value: insertSetting.value,
          description: insertSetting.description,
          updatedAt: new Date()
        })
        .where(eq(serverSettings.key, insertSetting.key))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(serverSettings)
        .values(insertSetting)
        .returning();
      return created;
    }
  }

  async getServerSetting(key: string): Promise<ServerSetting | undefined> {
    const [setting] = await db.select().from(serverSettings)
      .where(eq(serverSettings.key, key));
    return setting || undefined;
  }

  // Auth / Refresh Token methods
  async getRefreshToken(token: string): Promise<RefreshToken | undefined> {
    const [refreshToken] = await db.select().from(refreshTokens)
      .where(eq(refreshTokens.token, token));
    return refreshToken || undefined;
  }

  async createRefreshToken(tokenData: InsertRefreshToken): Promise<RefreshToken> {
    const [refreshToken] = await db
      .insert(refreshTokens)
      .values(tokenData)
      .returning();
    return refreshToken;
  }

  async revokeRefreshToken(token: string): Promise<void> {
    await db
      .update(refreshTokens)
      .set({ isRevoked: true })
      .where(eq(refreshTokens.token, token));
  }

  async revokeAllUserTokens(userId: number): Promise<void> {
    await db
      .update(refreshTokens)
      .set({ isRevoked: true })
      .where(eq(refreshTokens.userId, userId));
  }
}

export const storage = new DatabaseStorage();
