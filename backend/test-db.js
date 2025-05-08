import mongoose from 'mongoose';
import dotenv from 'dotenv';
import userModel from './models/user.model.js';
import projectModel from './models/project.model.js';

dotenv.config();

const testDatabase = async () => {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('Connected to MongoDB');

        // Test user creation
        const testUser = await userModel.create({
            email: 'test@example.com',
            password: 'testpassword123'
        });
        console.log('Test user created:', testUser);

        // Test project creation
        const testProject = await projectModel.create({
            name: 'Test Project',
            users: [testUser._id]
        });
        console.log('Test project created:', testProject);

        // Verify data retrieval
        const retrievedUser = await userModel.findById(testUser._id);
        console.log('Retrieved user:', retrievedUser);

        const retrievedProject = await projectModel.findById(testProject._id).populate('users');
        console.log('Retrieved project:', retrievedProject);

        // Clean up test data
        await userModel.deleteOne({ _id: testUser._id });
        await projectModel.deleteOne({ _id: testProject._id });
        console.log('Test data cleaned up');

    } catch (error) {
        console.error('Test failed:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    }
};

testDatabase(); 