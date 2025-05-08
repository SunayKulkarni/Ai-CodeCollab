import * as ai from '../services/ai.service.js'

export const getResult = async (req, res) => {
    try {
        const { prompt } = req.query;
        
        if (!prompt) {
            return res.status(400).json({ 
                error: 'Prompt is required' 
            });
        }

        console.log('AI request received:', { prompt });
        const result = await ai.generateResult(prompt);
        
        res.json({ 
            success: true,
            response: result 
        });
    } catch (error) {
        console.error('AI Controller Error:', error);
        res.status(500).json({ 
            success: false,
            error: error.message || 'Failed to generate AI response'
        });
    }
};