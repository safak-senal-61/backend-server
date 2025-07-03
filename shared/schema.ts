import { mysqlTable, text, int, boolean, timestamp, varchar } from "drizzle-orm/mysql-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = mysqlTable("users", {
  id: int("id").primaryKey().autoincrement(),
  username: varchar("username", { length: 100 }).notNull().unique(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  firstName: varchar("first_name", { length: 100 }),
  lastName: varchar("last_name", { length: 100 }),
  avatar: varchar("avatar", { length: 500 }),
  role: varchar("role", { length: 50 }).default("user").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  emailVerificationToken: varchar("email_verification_token", { length: 255 }),
  passwordResetToken: varchar("password_reset_token", { length: 255 }),
  passwordResetExpires: timestamp("password_reset_expires"),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const connections = mysqlTable("connections", {
  id: int("id").primaryKey().autoincrement(),
  clientId: text("client_id").notNull().unique(),
  ipAddress: text("ip_address").notNull(),
  connectedAt: timestamp("connected_at").defaultNow().notNull(),
  lastPing: timestamp("last_ping").defaultNow().notNull(),
  messageCount: int("message_count").default(0).notNull(),
  status: text("status").notNull().default("connected"), // connected, reconnecting, disconnected
});

export const messages = mysqlTable("messages", {
  id: int("id").primaryKey().autoincrement(),
  type: text("type").notNull(), // notification, update, alert, system
  content: text("content").notNull(),
  sentAt: timestamp("sent_at").defaultNow().notNull(),
  recipientCount: int("recipient_count").default(0).notNull(),
});

export const eventLogs = mysqlTable("event_logs", {
  id: int("id").primaryKey().autoincrement(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  level: text("level").notNull(), // INFO, CONN, MSG, WARN, ERROR
  message: text("message").notNull(),
  metadata: text("metadata"), // JSON string for additional data
});

export const videoRooms = mysqlTable("video_rooms", {
  id: int("id").primaryKey().autoincrement(),
  roomId: text("room_id").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  hostId: int("host_id").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  maxParticipants: int("max_participants").default(10).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  endedAt: timestamp("ended_at"),
});

export const videoParticipants = mysqlTable("video_participants", {
  id: int("id").primaryKey().autoincrement(),
  roomId: text("room_id").notNull(),
  userId: int("user_id").notNull(),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
  leftAt: timestamp("left_at"),
  isActive: boolean("is_active").default(true).notNull(),
});

export const serverSettings = mysqlTable("server_settings", {
  id: int("id").primaryKey().autoincrement(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  description: text("description"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  email: true,
  passwordHash: true,
  firstName: true,
  lastName: true,
  avatar: true,
  role: true,
});

export const insertConnectionSchema = createInsertSchema(connections).omit({
  id: true,
  connectedAt: true,
  lastPing: true,
});

export const insertMessageSchema = createInsertSchema(messages).pick({
  type: true,
  content: true,
});

export const insertEventLogSchema = createInsertSchema(eventLogs).pick({
  level: true,
  message: true,
  metadata: true,
});

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Connection = typeof connections.$inferSelect;
export type InsertConnection = z.infer<typeof insertConnectionSchema>;

export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

export type EventLog = typeof eventLogs.$inferSelect;
export type InsertEventLog = z.infer<typeof insertEventLogSchema>;

// Video Room schemas
export const insertVideoRoomSchema = createInsertSchema(videoRooms).pick({
  roomId: true,
  name: true,
  description: true,
  hostId: true,
  maxParticipants: true,
});

export const insertVideoParticipantSchema = createInsertSchema(videoParticipants).pick({
  roomId: true,
  userId: true,
});

export const insertServerSettingSchema = createInsertSchema(serverSettings).pick({
  key: true,
  value: true,
  description: true,
});

export const refreshTokens = mysqlTable("refresh_tokens", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("user_id").notNull(),
  token: varchar("token", { length: 255 }).notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  isRevoked: boolean("is_revoked").default(false).notNull(),
});

// Auth schemas
export const registerSchema = z.object({
  username: z.string().min(3).max(100),
  email: z.string().email().max(255),
  password: z.string().min(6).max(100),
  firstName: z.string().max(100).optional(),
  lastName: z.string().max(100).optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const refreshTokenSchema = createInsertSchema(refreshTokens).pick({
  userId: true,
  token: true,
  expiresAt: true,
});

export type VideoRoom = typeof videoRooms.$inferSelect;
export type InsertVideoRoom = z.infer<typeof insertVideoRoomSchema>;

export type VideoParticipant = typeof videoParticipants.$inferSelect;
export type InsertVideoParticipant = z.infer<typeof insertVideoParticipantSchema>;

export type ServerSetting = typeof serverSettings.$inferSelect;
export type InsertServerSetting = z.infer<typeof insertServerSettingSchema>;

export type RefreshToken = typeof refreshTokens.$inferSelect;
export type InsertRefreshToken = z.infer<typeof refreshTokenSchema>;

export type RegisterData = z.infer<typeof registerSchema>;
export type LoginData = z.infer<typeof loginSchema>;
