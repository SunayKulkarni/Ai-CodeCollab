import express from 'express';
import mongoose from 'mongoose';

const router = express.Router();

// Test database connection
router.get('/db-status', async (req, res) => {
    try {
        const status = {
            connectionState: mongoose.connection.readyState,
            connectionStateText: ['disconnected', 'connected', 'connecting', 'disconnecting'][mongoose.connection.readyState],
            databaseName: mongoose.connection.name,
            host: mongoose.connection.host,
            port: mongoose.connection.port,
            collections: await mongoose.connection.db.listCollections().toArray()
        };
        res.json(status);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Test database write
router.post('/test-write', async (req, res) => {
    try {
        const testCollection = mongoose.connection.db.collection('test_collection');
        const result = await testCollection.insertOne({
            test: 'data',
            timestamp: new Date()
        });
        res.json({ success: true, insertedId: result.insertedId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Test database read
router.get('/test-read', async (req, res) => {
    try {
        const testCollection = mongoose.connection.db.collection('test_collection');
        const documents = await testCollection.find({}).toArray();
        res.json(documents);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router; 