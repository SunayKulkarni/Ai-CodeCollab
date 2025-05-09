import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.GOOGLE_AI_KEY) {
    console.error('GOOGLE_AI_KEY is not set in environment variables');
    process.exit(1);
}

console.log('Initializing Google AI with key:', process.env.GOOGLE_AI_KEY ? 'Key exists' : 'No key found');

// Initialize the Google Generative AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_KEY);

// List available models
const listModels = async () => {
    try {
        const models = await genAI.listModels();
        console.log('Available models:', models);
        return models;
    } catch (error) {
        console.error('Error listing models:', error);
        throw error;
    }
};

// Call listModels when the service starts
listModels().then(models => {
    console.log('Models available:', models);
}).catch(error => {
    console.error('Failed to list models:', error);
});

// Configure the model once
const model = genAI.getGenerativeModel({
    model: 'gemini-pro-vision',  // Try the vision model which is definitely available
    generationConfig: {
        temperature: 0.4,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024,
    },
    safetySettings: [
        {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
            category: "HARM_CATEGORY_HATE_SPEECH",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
        }
    ]
});

// ---

// SPECIAL INSTRUCTION — FULL-STACK PROJECT GENERATOR:
// When the user asks you to build a project (e.g., "Build an Express server", "Create a Next.js app", "Generate a React + Node full stack app"), respond with a complete project scaffold using this format:

// 1. Start with a clean, visually structured **file/folder tree** like this:
// 📁 project-name/
// ├── README.md
// ├── package.json
// ├── .env.example
// ├── server.js
// └── routes/
//     └── projectroute.js
//     └── userroute.js
//     └── adminroute.js
//     └── authroute.js
//     └── errorroute.js
//     Above given are example, make accordingly to the user's requirements and your understanding about the project.
// ├── controllers/

// 2. Then list each file's full content in labeled and syntax-highlighted code blocks like this:
// ### 📄 server.js
// \`\`\`js
// const express = require('express');
// // ... full file content
// \`\`\`

// ### 📄 package.json
// \`\`\`json
// {
//   "name": "express-server",
//   ...
// }
// \`\`\`

// Additional Guidelines:
// - Never return project responses in JSON format with nested content.
// - Do NOT use keys like "file tree" or "content". Only return human-readable file trees and full code blocks.
// - Always use the correct language for syntax highlighting: \`\`\`js, \`\`\`json, \`\`\`env, \`\`\`markdown, etc.
// - Avoid unnecessary explanations unless asked.
// - For full-stack apps, clearly separate \`client/\` and \`server/\` folders.
// - Always include: README.md, .env.example, and package.json (with useful scripts and dependencies).
// - Use clean, professional code structure for each framework:
//   - **Express**: server.js, routes/, middleware/, .env, morgan, dotenv
//   - **Next.js**: app/pages structure, API routes, Tailwind (if needed)
//   - **React**: components/, hooks/, context/, sample fetch from backend
//   - **Full-stack**: Combine both with clear folder separation and integration logic
// Do not explain the code unless the user explicitly asks for it.


export const generateResult = async (prompt) => {
    try {
        console.log('Generating AI response for prompt:', prompt);
        
        // Get the model - using the most cost-effective version
        const model = genAI.getGenerativeModel({ 
            model: "gemini-1.5-flash-8b",
            generationConfig: {
                temperature: 0.4,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 8192,
            }
        });
        
        // Generate content
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        console.log('AI generated response:', text);
        return text;
    } catch (error) {
        console.error('Error generating AI response:', error);
        throw new Error(`AI Generation failed: ${error.message}`);
    }
};
