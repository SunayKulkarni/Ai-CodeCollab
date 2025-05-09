import React, { useState, useRef, useEffect } from 'react';
import { useEditor } from '../context/EditorContext';

const AIChat = () => {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);
    const { setActiveFile, refreshFileTree } = useEditor();

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
        setIsLoading(true);

        try {
            const response = await fetch('http://localhost:3001/api/ai/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ prompt: userMessage }),
            });

            if (!response.ok) {
                throw new Error('Failed to get AI response');
            }

            const data = await response.json();
            
            // Add AI response to messages
            setMessages(prev => [...prev, { 
                role: 'assistant', 
                content: data.text,
                codeBlocks: data.codeBlocks,
                savedFiles: data.savedFiles
            }]);

            // If there are saved files, refresh the file tree
            if (data.savedFiles && data.savedFiles.length > 0) {
                await refreshFileTree();
                // Open the first generated file
                if (data.savedFiles[0]) {
                    setActiveFile(data.savedFiles[0].filename);
                }
            }

        } catch (error) {
            console.error('Error:', error);
            setMessages(prev => [...prev, { 
                role: 'assistant', 
                content: 'Sorry, I encountered an error. Please try again.' 
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const renderMessage = (message) => {
        if (message.role === 'user') {
            return (
                <div className="flex justify-end mb-4">
                    <div className="bg-blue-500 text-white rounded-lg py-2 px-4 max-w-[80%]">
                        {message.content}
                    </div>
                </div>
            );
        }

        return (
            <div className="flex justify-start mb-4">
                <div className="bg-gray-700 rounded-lg py-2 px-4 max-w-[80%]">
                    <div className="text-white whitespace-pre-wrap">{message.content}</div>
                    {message.codeBlocks && message.codeBlocks.length > 0 && (
                        <div className="mt-2">
                            {message.codeBlocks.map((block, index) => (
                                <div key={index} className="bg-gray-800 rounded p-2 mt-2">
                                    <div className="text-gray-400 text-sm mb-1">
                                        {block.language || 'plaintext'}
                                    </div>
                                    <pre className="text-gray-200 overflow-x-auto">
                                        <code>{block.code}</code>
                                    </pre>
                                </div>
                            ))}
                        </div>
                    )}
                    {message.savedFiles && message.savedFiles.length > 0 && (
                        <div className="mt-2 text-sm text-gray-400">
                            Generated files:
                            {message.savedFiles.map((file, index) => (
                                <div key={index} className="mt-1">
                                    • {file.filename} ({file.language})
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full bg-gray-900">
            <div className="flex-1 overflow-y-auto p-4">
                {messages.map((message, index) => (
                    <div key={index}>
                        {renderMessage(message)}
                    </div>
                ))}
                {isLoading && (
                    <div className="flex justify-start mb-4">
                        <div className="bg-gray-700 rounded-lg py-2 px-4">
                            <div className="text-white">Thinking...</div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>
            <form onSubmit={handleSubmit} className="p-4 border-t border-gray-700">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Type your message..."
                        className="flex-1 bg-gray-800 text-white rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={isLoading}
                    />
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                        Send
                    </button>
                </div>
            </form>
        </div>
    );
};

export default AIChat; 