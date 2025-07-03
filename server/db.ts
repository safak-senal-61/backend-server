import { drizzle } from 'drizzle-orm/node-postgres';
import { Client } from 'pg';

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Create PostgreSQL client
const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

// Connect to the database
client.connect();

export const db = drizzle(client);

// Test the database connection
export async function testConnection() {
  try {
    const result = await client.query('SELECT 1 as test');
    console.log('Database connected successfully:', result.rows);
  } catch (error) {
    console.error('Database connection failed:', error);
  }
}