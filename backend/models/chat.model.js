import mongoose from 'mongoose';

const chatSchema = new mongoose.Schema({
    _id: {
        type: String,
        required: true
    },
    projectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: true
    },
    message: {
        type: String,
        required: true
    },
    sender: {
        _id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        email: {
            type: String,
            required: true
        },
        type: {
            type: String,
            enum: ['user', 'ai'],
            default: 'user'
        }
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
}, { collection: 'chats' });

// Add indexes for better query performance
chatSchema.index({ projectId: 1, timestamp: 1 });
chatSchema.index({ _id: 1 }, { unique: true });

const chatModel = mongoose.model('Chat', chatSchema);

export default chatModel; 