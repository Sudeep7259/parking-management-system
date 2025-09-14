import { db } from '@/db';
import { user, userRoles } from '@/db/schema';
import { eq } from 'drizzle-orm';

async function main() {
    // Check if users exist
    const existingUsers = await db.select().from(user);
    
    if (existingUsers.length === 0) {
        // Create test users
        const testUsers = [
            {
                id: 'user_admin_001',
                name: 'Admin User',
                email: 'admin@parkingapp.com',
                emailVerified: true,
                image: null,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
            {
                id: 'user_owner_001',
                name: 'Sarah Johnson',
                email: 'sarah.j@owners.com',
                emailVerified: true,
                image: null,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
            {
                id: 'user_owner_002',
                name: 'Michael Chen',
                email: 'm.chen@owners.com',
                emailVerified: true,
                image: null,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
            {
                id: 'user_owner_003',
                name: 'Priya Patel',
                email: 'priya.p@owners.com',
                emailVerified: true,
                image: null,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
            {
                id: 'user_customer_001',
                name: 'David Rodriguez',
                email: 'd.rodriguez@customers.com',
                emailVerified: true,
                image: null,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
            {
                id: 'user_customer_002',
                name: 'Emma Thompson',
                email: 'emma.t@customers.com',
                emailVerified: true,
                image: null,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
            {
                id: 'user_customer_003',
                name: 'James Wilson',
                email: 'j.wilson@customers.com',
                emailVerified: true,
                image: null,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
            {
                id: 'user_customer_004',
                name: 'Lisa Anderson',
                email: 'lisa.a@customers.com',
                emailVerified: true,
                image: null,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
            {
                id: 'user_customer_005',
                name: 'Robert Kim',
                email: 'r.kim@customers.com',
                emailVerified: true,
                image: null,
                createdAt: new Date(),
                updatedAt: new Date(),
            }
        ];

        await db.insert(user).values(testUsers);
        console.log('✅ Created 9 test users');
    }

    // Check existing roles
    const existingRoles = await db.select().from(userRoles);
    
    if (existingRoles.length === 0) {
        const now = new Date().toISOString();
        
        const userRolesData = [
            // Admin role
            {
                userId: 'user_admin_001',
                role: 'admin',
                createdAt: now,
                updatedAt: now,
            },
            // Owner roles
            {
                userId: 'user_owner_001',
                role: 'owner',
                createdAt: now,
                updatedAt: now,
            },
            {
                userId: 'user_owner_002',
                role: 'owner',
                createdAt: now,
                updatedAt: now,
            },
            {
                userId: 'user_owner_003',
                role: 'owner',
                createdAt: now,
                updatedAt: now,
            },
            // Customer roles
            {
                userId: 'user_customer_001',
                role: 'customer',
                createdAt: now,
                updatedAt: now,
            },
            {
                userId: 'user_customer_002',
                role: 'customer',
                createdAt: now,
                updatedAt: now,
            },
            {
                userId: 'user_customer_003',
                role: 'customer',
                createdAt: now,
                updatedAt: now,
            },
            {
                userId: 'user_customer_004',
                role: 'customer',
                createdAt: now,
                updatedAt: now,
            },
            {
                userId: 'user_customer_005',
                role: 'customer',
                createdAt: now,
                updatedAt: now,
            }
        ];

        await db.insert(userRoles).values(userRolesData);
        console.log('✅ Created user roles: 1 admin, 3 owners, 5 customers');
    } else {
        console.log('ℹ️  User roles already exist, skipping...');
    }
    
    console.log('✅ User roles seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});