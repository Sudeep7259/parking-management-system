import { db } from '@/db';
import { user, appUsers } from '@/db/schema';

async function main() {
    const currentTime = new Date().toISOString();

    // First create auth users
    const authUsersData = [
        {
            id: 'auth_user_001',
            name: 'Rajesh Kumar',
            email: 'admin@parkops.com',
            emailVerified: true,
            createdAt: new Date(),
            updatedAt: new Date(),
        },
        {
            id: 'auth_user_002',
            name: 'Priya Sharma',
            email: 'priya.sharma@parkops.com',
            emailVerified: true,
            createdAt: new Date(),
            updatedAt: new Date(),
        },
        {
            id: 'auth_user_003',
            name: 'Vikram Singh',
            email: 'vikram.singh@parkops.com',
            emailVerified: true,
            createdAt: new Date(),
            updatedAt: new Date(),
        },
        {
            id: 'auth_user_004',
            name: 'Anita Patel',
            email: 'anita.patel@parkops.com',
            emailVerified: true,
            createdAt: new Date(),
            updatedAt: new Date(),
        },
        {
            id: 'auth_user_005',
            name: 'Arjun Mehta',
            email: 'arjun.mehta@parkops.com',
            emailVerified: true,
            createdAt: new Date(),
            updatedAt: new Date(),
        }
    ];

    await db.insert(user).values(authUsersData);

    // Then create app users linking to auth users
    const appUsersData = [
        {
            authUserId: 'auth_user_001',
            name: 'Rajesh Kumar',
            email: 'admin@parkops.com',
            phone: '+919876543210',
            role: 'admin',
            status: 'active',
            createdAt: currentTime,
            updatedAt: currentTime,
        },
        {
            authUserId: 'auth_user_002',
            name: 'Priya Sharma',
            email: 'priya.sharma@parkops.com',
            phone: '+919123456789',
            role: 'client',
            status: 'active',
            createdAt: currentTime,
            updatedAt: currentTime,
        },
        {
            authUserId: 'auth_user_003',
            name: 'Vikram Singh',
            email: 'vikram.singh@parkops.com',
            phone: '+919234567890',
            role: 'client',
            status: 'active',
            createdAt: currentTime,
            updatedAt: currentTime,
        },
        {
            authUserId: 'auth_user_004',
            name: 'Anita Patel',
            email: 'anita.patel@parkops.com',
            phone: '+919345678901',
            role: 'customer',
            status: 'active',
            createdAt: currentTime,
            updatedAt: currentTime,
        },
        {
            authUserId: 'auth_user_005',
            name: 'Arjun Mehta',
            email: 'arjun.mehta@parkops.com',
            phone: '+919456789012',
            role: 'customer',
            status: 'inactive',
            createdAt: currentTime,
            updatedAt: currentTime,
        }
    ];

    await db.insert(appUsers).values(appUsersData);
    
    console.log('✅ App users seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});