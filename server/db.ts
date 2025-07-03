import { drizzle } from 'drizzle-orm/neon-serverless';
import { neon } from '@neondatabase/serverless';
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Create neon client for serverless environment
const sql = neon(process.env.DATABASE_URL);
export const db = drizzle(sql);

// Test the database connection
export async function testConnection() {
  try {
    const result = await sql('SELECT 1 as test');
    console.log('Database connected successfully:', result);
  } catch (error) {
    console.error('Database connection failed:', error);
  }
}