import express from 'express';
import fs from 'fs/promises';
import path from 'path';

const router = express.Router();

// List all files in the workspace
router.get('/list', async (req, res) => {
    try {
        const workspaceDir = path.join(process.cwd(), 'workspace');
        
        // Ensure workspace directory exists
        try {
            await fs.mkdir(workspaceDir, { recursive: true });
        } catch (error) {
            console.error('Error creating workspace directory:', error);
        }

        const files = await fs.readdir(workspaceDir);
        const fileTree = {};

        for (const file of files) {
            const filePath = path.join(workspaceDir, file);
            const stats = await fs.stat(filePath);
            
            if (stats.isFile()) {
                const content = await fs.readFile(filePath, 'utf-8');
                fileTree[file] = {
                    file: {
                        contents: content
                    }
                };
            }
        }

        res.json({ files: fileTree });
    } catch (error) {
        console.error('Error listing files:', error);
        res.status(500).json({ error: 'Failed to list files' });
    }
});

export default router; 