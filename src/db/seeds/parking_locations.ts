import { db } from '@/db';
import { parkingLocations } from '@/db/schema';

async function main() {
    console.log('📝 Starting parking locations seeder...');
    
    const sampleParkingLocation = {
        ownerUserId: 'user_01h4kxt2e8z9y3b1n7m6q5w8r4',
        title: 'Downtown Parking Spot',
        description: 'Convenient parking space in downtown area',
        address: '123 Main Street',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
        latitude: 19.0760,
        longitude: 72.8777,
        photos: null,
        totalSlots: 2,
        availableSlots: 2,
        pricingMode: 'hourly',
        basePricePerHourPaise: 1500,
        slabJson: null,
        approved: 1,
        approvedBy: 'user_01h4kxt2e8z9y3b1n7m6q5w8r4',
        approvedAt: new Date('2024-01-20').getTime(),
        createdAt: new Date('2024-01-15').toISOString(),
        updatedAt: new Date('2024-01-20').toISOString(),
    };

    await db.insert(parkingLocations).values(sampleParkingLocation);
    
    console.log('✅ Parking locations seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});