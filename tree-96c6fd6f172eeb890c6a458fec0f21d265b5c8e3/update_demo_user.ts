import { db } from './server/db';
import { users } from './shared/schema';
import { eq } from 'drizzle-orm';

async function updateDemoUser() {
  console.log('Updating demo user with new schema fields...');
  
  try {
    // Update the existing demo user
    const result = await db
      .update(users)
      .set({
        first_name: 'Sarah',
        last_name: 'Thompson',
        user_type: 'property_manager'
      })
      .where(eq(users.email, 'sarah@premierproperties.com'))
      .returning();
      
    if (result.length > 0) {
      console.log('Updated user:', result[0].email, result[0].user_type);
    } else {
      console.log('User not found');
    }
    
  } catch (error) {
    console.error('Error updating demo user:', error);
  }
  
  process.exit(0);
}

updateDemoUser();
