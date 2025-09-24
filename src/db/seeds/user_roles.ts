import { db } from '@/db';
import { userRoles } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

async function main() {
    try {
        // Check if admin role already exists for auth_user_001
        const existingRole = await db
            .select()
            .from(userRoles)
            .where(
                and(
                    eq(userRoles.userId, 'auth_user_001'),
                    eq(userRoles.role, 'admin')
                )
            )
            .limit(1);

        if (existingRole.length > 0) {
            console.log('ℹ️ Admin role already exists for user auth_user_001, skipping...');
            return;
        }

        // Insert new admin role record
        const newAdminRole = {
            userId: 'auth_user_001',
            role: 'admin',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        await db.insert(userRoles).values(newAdminRole);
        
        console.log('✅ Admin role added successfully for user auth_user_001 (Rajesh Kumar)');
    } catch (error) {
        console.error('❌ Failed to add admin role:', error);
        throw error;
    }
}

main().catch((error) => {
    console.error('❌ User roles seeder failed:', error);
});