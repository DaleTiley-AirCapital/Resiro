import { db } from './server/db';
import { users, organizations } from './shared/schema';
import { sql } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';

async function resetDatabase() {
  console.log('Resetting database with new schema...');
  
  try {
    // Drop and recreate tables with new schema
    await db.execute(sql`DROP TABLE IF EXISTS users CASCADE`);
    await db.execute(sql`DROP TABLE IF EXISTS organizations CASCADE`);
    
    // The tables will be recreated when we push the schema
    console.log('Database cleared. Please run: npm run db:push');
    
  } catch (error) {
    console.error('Error resetting database:', error);
  }
  
  process.exit(0);
}

resetDatabase();
