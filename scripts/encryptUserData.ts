/**
 * Migration script to encrypt existing user data
 * Run with: npx ts-node scripts/encryptUserData.ts
 */

import db from '../src/lib/db';
import { encryptData, isEncrypted } from '../src/utils/encryption';

async function migrateUserData() {
  try {
    console.log('Starting data migration to encrypt sensitive user data...');
    
    // Get all users
    const users = await db.users.findMany();
    console.log(`Found ${users.length} users to process`);
    
    let encryptedCount = 0;
    
    for (const user of users) {
      // Skip already encrypted users
      if (user.isDataEncrypted) {
        console.log(`User ${user.userId} already has encrypted data. Skipping.`);
        continue;
      }
      
      // Check if data needs encryption (not already encrypted)
      const needsEncryption = 
        (user.phoneNumber && !isEncrypted(user.phoneNumber)) ||
        (user.realName && !isEncrypted(user.realName));
      
      if (!needsEncryption) {
        console.log(`No data to encrypt for user ${user.userId}. Skipping.`);
        continue;
      }
      
      // Encrypt phone number and real name
      const updates = {
        phoneNumber: user.phoneNumber ? encryptData(user.phoneNumber) : undefined,
        realName: user.realName ? encryptData(user.realName) : undefined,
        isDataEncrypted: true
      };
      
      // Update user record
      await db.users.update(user.userId, updates);
      encryptedCount++;
      
      console.log(`Encrypted data for user ${user.userId}`);
    }
    
    console.log(`Migration completed. Encrypted data for ${encryptedCount} users.`);
    
  } catch (error) {
    console.error('Error during migration:', error);
    process.exit(1);
  }
}

// Run the migration
migrateUserData()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
