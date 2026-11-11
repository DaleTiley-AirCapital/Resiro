import { db } from './server/db';
import { users, organizations } from './shared/schema';
import bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';

async function setupDemoData() {
  console.log('Setting up demo data...');
  
  try {
    // Create demo organization with proper UUID
    const orgId = randomUUID();
    const [org] = await db.insert(organizations).values({
      id: orgId,
      name: 'Premier Properties',
      slug: 'premier-properties',
      settings: {}
    }).returning();
    
    console.log('Created organization:', org.name, org.id);
    
    // Create demo user with hashed password and proper UUID
    const hashedPassword = await bcrypt.hash('demo123', 10);
    const userId = randomUUID();
    
    const [user] = await db.insert(users).values({
      id: userId,
      username: 'sarah.thompson',
      email: 'sarah@premierproperties.com',
      password: hashedPassword,
      role: 'admin',
      org_id: org.id
    }).returning();
    
    console.log('Created user:', user.username, user.id);
    console.log('\n=== Demo Login Credentials ===');
    console.log('Email: sarah@premierproperties.com');
    console.log('Password: demo123');
    console.log('================================');
    
  } catch (error) {
    console.error('Error setting up demo data:', error);
  }
  
  process.exit(0);
}

setupDemoData();
