import { db } from './server/db.js';
import { users, organizations } from './shared/schema.js';
import bcrypt from 'bcrypt';

async function setupDemoData() {
  console.log('Setting up demo data...');
  
  try {
    // Create demo organization
    const [org] = await db.insert(organizations).values({
      id: 'org-demo-2024-001',
      name: 'Premier Properties',
      slug: 'premier-properties',
      settings: {}
    }).returning();
    
    console.log('Created organization:', org);
    
    // Create demo user with hashed password
    const hashedPassword = await bcrypt.hash('demo123', 10);
    
    const [user] = await db.insert(users).values({
      id: 'user-demo-2024-001',
      username: 'sarah.thompson',
      email: 'sarah@premierproperties.com',
      password: hashedPassword,
      role: 'admin',
      org_id: org.id
    }).returning();
    
    console.log('Created user:', user);
    console.log('\nDemo credentials:');
    console.log('Email: sarah@premierproperties.com');
    console.log('Password: demo123');
    
  } catch (error) {
    console.error('Error setting up demo data:', error);
  }
  
  process.exit(0);
}

setupDemoData();
