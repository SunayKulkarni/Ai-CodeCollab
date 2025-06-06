import React, { useState, useEffect, useContext, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import axios from '../config/axios.js'
import { initializeSocket, recieveMessage, sendMessage, disconnectSocket } from '../config/socket.js'
import { UserContext } from '../context/user.context.jsx'
import Markdown from 'markdown-to-jsx'
import { RiFolder3Line, RiFolderOpenLine, RiFile3Line, RiAddLine, RiPlayLine } from 'react-icons/ri'

const Project = () => {
    const location = useLocation()
    const { user } = useContext(UserContext)

    // State management
    const [isSidePanelOpen, setIsSidePanelOpen] = useState(false)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [selectedUserId, setSelectedUserId] = useState(new Set())
    const [users, setUsers] = useState([])
    const [project, setProject] = useState(location.state.project)
    const [message, setMessage] = useState('')
    const [messages, setMessages] = useState([])
    const [copiedStatus, setCopiedStatus] = useState(false)
    const [fileTree, setFileTree] = useState({})
    const [currentFile, setCurrentFile] = useState(null)
    const [openFiles, setOpenFiles] = useState([])
    const [isFileMenuOpen, setIsFileMenuOpen] = useState(false)
    const [newFileName, setNewFileName] = useState('')
    const [isCreatingFile, setIsCreatingFile] = useState(false)
    const [expandedFolders, setExpandedFolders] = useState({})
    const [isRunning, setIsRunning] = useState(false)
    const [runOutput, setRunOutput] = useState(null)
    const [isAiLoading, setIsAiLoading] = useState(false)
    const [processedMessageIds] = useState(new Set())
    const [aiGeneratedFiles] = useState(new Set())

    // Refs
    const messageBox = React.createRef()
    const lineNumberRef = useRef(null)
    const textareaRef = useRef(null)
    const resizerRef = useRef(null)

    // Editor state
    const [activeLine, setActiveLine] = useState(1)
    const [editorWidth, setEditorWidth] = useState(600)
    const [isResizing, setIsResizing] = useState(false)

    const handleUserClick = (id) => {
        setSelectedUserId(prevSelectedUserId => {
            const newSelectedUserId = new Set(prevSelectedUserId)
            if (newSelectedUserId.has(id)) {
                newSelectedUserId.delete(id) // remove if already present
            } else {
                newSelectedUserId.add(id) // add if not present
            }
            return newSelectedUserId;
        })
    }

    function addCollaborators() {
        axios.put(`/projects/add-user`, {
            projectId: location.state.project._id,
            users: Array.from(selectedUserId)
        })
            .then(response => {
                console.log(response.data)
                setIsModalOpen(false)
            })
            .catch(error => {
                console.log(error)
            })
    }

    const send = () => {
        if (!message.trim()) return; // Don't send empty messages
        
        const isAiMessage = message.toLowerCase().startsWith('@ai ');
        console.log('Sending message:', { message, sender: user, isAiMessage });
        
        // Generate a unique ID for the message
        const messageId = `msg_${Date.now()}`;
        
        // Add message to local state immediately for better UX
        const newMessage = {
            _id: messageId,
            message,
            sender: user,
            type: 'outgoing',
            timestamp: new Date(),
            projectId: project._id
        };
        
        setMessages(prevMessages => [...prevMessages, newMessage]);
        sendMessage('project-message', {
            message,
            sender: user,
            _id: messageId,
            projectId: project._id
        });
        setMessage('');
    };

    function writeAiMessage(message) {
        let messageObject;
        try {
            messageObject = JSON.parse(message);
        } catch (e) {
            messageObject = { text: message };
        }

        return (
            <div className='overflow-auto bg-slate-800/50 rounded-lg border border-blue-500/20'>
                {/* AI Header */}
                <div className='flex items-center justify-between px-4 py-2 bg-gradient-to-r from-blue-900/50 to-slate-800/50 border-b border-blue-500/20'>
                    <div className='flex items-center gap-2'>
                        <div className='w-6 h-6 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center'>
                            <i className='ri-robot-2-line text-white text-sm'></i>
                        </div>
                        <span className='text-sm font-medium text-blue-300'>AI Assistant</span>
                    </div>
                    <button
                        onClick={() => {
                            navigator.clipboard.writeText(messageObject.text);
                            setCopiedStatus(true);
                            setTimeout(() => setCopiedStatus(false), 1000);
                        }}
                        className='text-xs bg-slate-700/50 hover:bg-slate-600/50 px-2 py-1 rounded text-blue-300 transition flex items-center gap-1'
                        title={copiedStatus ? "Copied!" : "Copy to clipboard"}
                    >
                        <i className={copiedStatus ? 'ri-check-line' : 'ri-clipboard-fill'}></i>
                        <span>{copiedStatus ? 'Copied' : 'Copy'}</span>
                    </button>
                </div>

                {/* AI Message Content */}
                <div className='p-4'>
                    <Markdown
                        children={messageObject.text}
                        className='prose prose-invert max-w-none'
                        options={{
                            overrides: {
                                h1: { props: { className: 'text-xl font-bold mb-3 text-blue-300 border-b border-blue-500/20 pb-2' } },
                                h2: { props: { className: 'text-lg font-semibold mb-2 text-blue-200' } },
                                p: { props: { className: 'mb-3 text-slate-200 leading-relaxed' } },
                                li: { props: { className: 'list-disc ml-5 mb-2 text-slate-200' } },
                                code: { props: { className: 'bg-slate-900 text-green-400 px-1.5 py-0.5 rounded text-sm font-mono' } },
                                pre: { props: { className: 'bg-slate-900 p-3 rounded-lg mb-3 overflow-x-auto border border-slate-700' } },
                                strong: { props: { className: 'font-bold text-blue-200' } },
                                a: { props: { className: 'text-blue-400 hover:text-blue-300 underline' } },
                                blockquote: { props: { className: 'border-l-4 border-blue-500 pl-4 italic text-slate-300 my-3' } },
                                ul: { props: { className: 'list-disc ml-5 mb-3' } },
                                ol: { props: { className: 'list-decimal ml-5 mb-3' } },
                            }
                        }}
                    />
                </div>
            </div>
        );
    }

    // Add file operations handlers
    const handleCreateFile = () => {
        if (!newFileName) return;
        const fileName = newFileName.endsWith('.js') ? newFileName : `${newFileName}.js`;
        setFileTree(prev => ({
            ...prev,
            [fileName]: {
                file: {
                    contents: '// Start coding here...'
                }
            }
        }));
        setNewFileName('');
        setIsCreatingFile(false);
        setCurrentFile(fileName);
        setOpenFiles(prev => [...new Set([...prev, fileName])]);
    };

    const handleCloseFile = (fileName) => {
        setOpenFiles(prev => prev.filter(f => f !== fileName));
        if (currentFile === fileName) {
            const remainingFiles = openFiles.filter(f => f !== fileName);
            setCurrentFile(remainingFiles[remainingFiles.length - 1] || null);
        }
    };

    // Add keyboard shortcuts
    useEffect(() => {
        const handleKeyPress = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
                e.preventDefault();
                setIsCreatingFile(true);
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, []);

    useEffect(() => {
        initializeSocket(project._id) // Initialize socket connection

        // Join the project room and request chat history
        sendMessage('join-project', project._id);

        // Notify others that user has joined
        sendMessage('user-joined', user);

        // Set up chat history listener
        recieveMessage('chat-history', (history) => {
            console.log('Received chat history:', history);
            if (Array.isArray(history)) {
            setMessages(history.map(msg => ({
                    _id: msg._id,
                    message: msg.message,
                    sender: msg.sender,
                    type: msg.sender?.email === user?.email ? 'outgoing' : 'incoming',
                    timestamp: msg.timestamp,
                    projectId: msg.projectId
            })));
            }
        });

        // Set up message listener
        recieveMessage('project-message', data => {
            console.log('Received project message:', data);
            
            // Skip if we've already processed this message
            if (processedMessageIds.has(data._id)) {
                console.log('Message already processed, skipping:', data._id);
                return;
            }

            setMessages(prevMessages => {
                // Check if message already exists to prevent duplicates
                const messageExists = prevMessages.some(msg => 
                    msg._id === data._id || // Check by ID first
                    (msg.message === data.message && 
                    msg.sender?.email === data.sender?.email &&
                    Math.abs(new Date(msg.timestamp) - new Date(data.timestamp)) < 1000)
                );
                
                if (messageExists) {
                    console.log('Message already exists, skipping duplicate');
                    return prevMessages;
                }

                // Add message ID to processed set
                processedMessageIds.add(data._id);

                // Remove loading message if it exists
                const filteredMessages = prevMessages.filter(msg => 
                    !msg._id.startsWith('loading_') || msg._id === data._id
                );

                console.log('Previous messages:', filteredMessages);
                const newMessages = [...filteredMessages, {
                    _id: data._id,
                    message: data.message,
                    sender: data.sender,
                    type: data.sender?.email === user?.email ? 'outgoing' : 'incoming',
                    timestamp: data.timestamp,
                    projectId: data.projectId
                }];
                console.log('New messages:', newMessages);
                return newMessages;
            });
        });

        // Handle user presence
        recieveMessage('user-joined', (userData) => {
            console.log('User joined:', userData);
            // You can add a notification or update UI to show who joined
        });

        recieveMessage('user-left', (data) => {
            console.log('User left:', data);
            // You can add a notification or update UI to show who left
        });

        axios.get(`/projects/get-project/${location.state.project._id}`)
            .then(response => {
                console.log('Project data:', response.data.project);
                setProject(response.data.project);
            })
            .catch(error => {
                console.error('Error fetching project:', error);
            });

        axios.get('/users/all')
            .then(response => {
                console.log('Users data:', response.data.users);
                setUsers(response.data.users);
            })
            .catch(error => {
                console.error('Error fetching users:', error);
            });

        // Cleanup function to remove socket listeners
        return () => {
            disconnectSocket();
            processedMessageIds.clear();
        };
    }, [project._id, user]); // Add dependencies to ensure proper reconnection


    useEffect(() => {
        if (messageBox.current) {
            messageBox.current.scrollTop = messageBox.current.scrollHeight
        }
    }, [messages, messageBox])

    // Compute users not in the project
    const projectUserIds = new Set((project.users || []).map(u => typeof u === 'object' ? u._id : u));
    const usersNotInProject = users.filter(u => !projectUserIds.has(u._id));

    // Sync scroll between textarea and line numbers
    const handleEditorScroll = (e) => {
        if (lineNumberRef.current) {
            lineNumberRef.current.scrollTop = e.target.scrollTop;
        }
        updateActiveLine();
    };

    // Update active line based on cursor position
    const updateActiveLine = () => {
        if (textareaRef.current) {
            const value = textareaRef.current.value;
            const selectionStart = textareaRef.current.selectionStart;
            const lines = value.substr(0, selectionStart).split('\n');
            setActiveLine(lines.length);
        }
    };

    // Auto-focus editor when file is selected
    useEffect(() => {
        if (textareaRef.current && currentFile) {
            textareaRef.current.focus();
        }
    }, [currentFile]);

    // Resizable editor panel
    useEffect(() => {
        const handleMouseMove = (e) => {
            if (!isResizing) return;
            setEditorWidth(Math.max(300, e.clientX - (resizerRef.current?.getBoundingClientRect().left || 0)));
        };
        const handleMouseUp = () => setIsResizing(false);
        if (isResizing) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizing]);

    // Helper to toggle folder open/close
    const toggleFolder = (path) => {
        setExpandedFolders(prev => ({ ...prev, [path]: !prev[path] }));
    };

    // Add function to handle AI code generation
    const handleAiCodeGeneration = (messageObject) => {
        if (messageObject.type === 'ai' && messageObject.text.includes('```')) {
            // Extract code blocks from the message
            const codeBlocks = messageObject.text.match(/```(\w+)?\n([\s\S]*?)```/g);
            
            if (codeBlocks) {
                codeBlocks.forEach((block, index) => {
                    // Extract language and code
                    const match = block.match(/```(\w+)?\n([\s\S]*?)```/);
                    if (match) {
                        const [, language, code] = match;
                        const fileExtension = language || 'js';
                        const fileName = `ai_generated_${Date.now()}_${index + 1}.${fileExtension}`;
                        
                        // Add to file tree
                        setFileTree(prev => ({
                            ...prev,
                            [fileName]: {
                                file: {
                                    contents: code.trim(),
                                    language: language || 'javascript'
                                }
                            }
                        }));

                        // Track AI generated file
                        aiGeneratedFiles.add(fileName);

                        // Open the file in editor
                        setCurrentFile(fileName);
                        setOpenFiles(prev => [...new Set([...prev, fileName])]);
                    }
                });
            }
        }
    };

    // Modify the message rendering to include code handling
    const renderMessage = (messageObject) => {
        // Handle AI code generation when message is received
        if (messageObject.type === 'ai') {
            handleAiCodeGeneration(messageObject);
        }

        return (
            <div key={messageObject._id} className={`message ${messageObject.type} mb-4`}>
                <span className="text-xs text-slate-400 mb-1 ml-2 mr-2">
                    {messageObject.sender?.email}
                </span>
                <div
                    className={`
                        max-w-xs md:max-w-md
                        ${messageObject.type === 'ai' 
                            ? 'w-full' 
                            : `px-5 py-3 rounded-2xl shadow-lg text-base font-medium whitespace-pre-wrap break-words
                               transition-all duration-200
                               ${messageObject.type === 'outgoing'
                                    ? 'bg-slate-700 text-blue-100 border border-slate-600 rounded-br-3xl rounded-tr-2xl'
                                    : 'bg-blue-900 text-blue-200 border border-blue-700 rounded-bl-3xl rounded-tl-2xl'}
                               group-hover:shadow-xl`
                        }
                    `}
                >
                    {messageObject.type === 'ai' ? writeAiMessage(messageObject.message) : messageObject.message}
                </div>
                <span className="text-xs text-slate-500 mt-1">
                    {new Date(messageObject.timestamp).toLocaleTimeString()}
                </span>
            </div>
        );
    };

    // Add file tree rendering with AI file indicators
    const renderFileTree = (tree, parentPath = '', depth = 0) => {
        if (!tree) return null;
        return Object.entries(tree).map(([name, value]) => {
            const isDir = value.type === 'directory' || value.contents;
            const path = parentPath ? `${parentPath}/${name}` : name;
            const isOpen = expandedFolders[path] || depth === 0;
            const isAiGenerated = aiGeneratedFiles.has(name);

            // File node
            if (!isDir) {
                return (
                    <button
                        key={path}
                        onClick={() => {
                            setCurrentFile(path);
                            setOpenFiles(prev => [...new Set([...prev, path])]);
                        }}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 text-left 
                            ${currentFile === path ? 'bg-blue-900/50 text-blue-300 border border-blue-500/20 font-semibold' : 'hover:bg-slate-700/50 text-slate-300 hover:text-blue-300'}`}
                        style={{ paddingLeft: `${depth * 20 + 16}px` }}
                    >
                        <RiFile3Line className={`text-lg ${currentFile === path ? 'text-blue-400' : 'text-slate-400'}`} />
                        <span className="truncate text-sm">{name}</span>
                        {isAiGenerated && (
                            <span className="ml-auto px-2 py-0.5 text-xs bg-blue-900/30 text-blue-400 rounded-full">
                                AI
                            </span>
                        )}
                    </button>
                );
            }

            // Directory node
            return (
                <div key={path}>
                    <button
                        onClick={() => toggleFolder(path)}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 text-left group hover:bg-slate-700/40"
                        style={{ paddingLeft: `${depth * 20 + 12}px` }}
                    >
                        {isOpen ? <RiFolderOpenLine className="text-lg text-yellow-400" /> : <RiFolder3Line className="text-lg text-yellow-300" />}
                        <span className="truncate text-sm font-medium text-yellow-200 group-hover:text-yellow-100">{name}</span>
                        <span className="ml-auto text-xs text-slate-500">{isOpen ? '-' : '+'}</span>
                    </button>
                    <div className={`overflow-hidden transition-all ${isOpen ? 'max-h-[1000px]' : 'max-h-0'}`} style={{ marginLeft: 0 }}>
                        {isOpen && renderFileTree(value.contents || value, path, depth + 1)}
                    </div>
                </div>
            );
        });
    };

    // Helper to resolve a file node by its path (e.g., 'backend/server.js')
    const getFileNodeByPath = (tree, path) => {
        if (!path) return null;
        const parts = path.split('/');
        let node = tree;
        for (let part of parts) {
            if (!node) return null;
            node = node[part]?.contents || node[part]?.file || node[part];
        }
        return node && node.contents === undefined ? node : node.file || node;
    };

    // Add function to execute code
    const executeCode = async () => {
        if (!currentFile) return;
        
        const fileContent = getFileNodeByPath(fileTree, currentFile)?.contents;
        if (!fileContent) return;

        setIsRunning(true);
        setRunOutput(null);

        try {
            // Determine file type
            const fileExtension = currentFile.split('.').pop().toLowerCase();
            
            if (fileExtension === 'js' || fileExtension === 'jsx') {
                // For JavaScript files, create a temporary HTML file to run in browser
                const htmlContent = `
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <title>Code Execution</title>
                        <style>
                            body {
                                font-family: Arial, sans-serif;
                                margin: 0;
                                padding: 20px;
                                background: #1e1e1e;
                                color: #fff;
                            }
                            #output {
                                background: #2d2d2d;
                                padding: 20px;
                                border-radius: 8px;
                                margin-top: 20px;
                                min-height: 100px;
                                white-space: pre-wrap;
                                word-wrap: break-word;
                            }
                            .console-log {
                                color: #4ec9b0;
                                margin: 5px 0;
                                font-family: 'Consolas', monospace;
                            }
                            .console-error {
                                color: #f14c4c;
                                margin: 5px 0;
                                font-family: 'Consolas', monospace;
                            }
                            .console-warn {
                                color: #dcdcaa;
                                margin: 5px 0;
                                font-family: 'Consolas', monospace;
                            }
                            .console-info {
                                color: #569cd6;
                                margin: 5px 0;
                                font-family: 'Consolas', monospace;
                            }
                        </style>
                        <script>
                            // Store original console methods
                            const originalConsole = {
                                log: console.log,
                                error: console.error,
                                warn: console.warn,
                                info: console.info
                            };

                            // Function to format output
                            function formatOutput(value) {
                                if (value === null) return 'null';
                                if (value === undefined) return 'undefined';
                                
                                if (typeof value === 'object') {
                                    try {
                                        return JSON.stringify(value, null, 2);
                                    } catch (e) {
                                        return String(value);
                                    }
                                }
                                
                                return String(value);
                            }

                            // Function to append to output
                            function appendToOutput(type, args) {
                                const output = document.getElementById('output');
                                const div = document.createElement('div');
                                div.className = 'console-' + type;
                                
                                // Format multiple arguments
                                const formattedArgs = Array.from(args).map(arg => formatOutput(arg));
                                div.textContent = formattedArgs.join(' ');
                                
                                output.appendChild(div);
                                output.scrollTop = output.scrollHeight;
                            }

                            // Override console methods
                            console.log = function(...args) {
                                originalConsole.log.apply(console, args);
                                appendToOutput('log', args);
                            };

                            console.error = function(...args) {
                                originalConsole.error.apply(console, args);
                                appendToOutput('error', args);
                            };

                            console.warn = function(...args) {
                                originalConsole.warn.apply(console, args);
                                appendToOutput('warn', args);
                            };

                            console.info = function(...args) {
                                originalConsole.info.apply(console, args);
                                appendToOutput('info', args);
                            };

                            // Add a global error handler
                            window.onerror = function(message, source, lineno, colno, error) {
                                appendToOutput('error', [\`Error: \${message}\nLine: \${lineno}, Column: \${colno}\`]);
                                return false;
                            };

                            // Add a global unhandled promise rejection handler
                            window.onunhandledrejection = function(event) {
                                appendToOutput('error', [\`Unhandled Promise Rejection: \${event.reason}\`]);
                            };

                            // Execute the code
                            try {
                                // Create a safe execution environment
                                const safeEval = new Function('console', \`
                                    try {
                                        ${fileContent}
                                    } catch (error) {
                                        console.error(error);
                                    }
                                \`);
                                
                                // Execute the code with our modified console
                                safeEval(console);
                            } catch (error) {
                                appendToOutput('error', [error.message]);
                            }
                        </script>
                    </head>
                    <body>
                        <h2>Code Output:</h2>
                        <div id="output"></div>
                    </body>
                    </html>
                `;
                
                // Create a blob and open in new window
                const blob = new Blob([htmlContent], { type: 'text/html' });
                const url = URL.createObjectURL(blob);
                const newWindow = window.open(url, '_blank');
                
                // Clean up the URL object after the window is closed
                if (newWindow) {
                    newWindow.onbeforeunload = () => {
                        URL.revokeObjectURL(url);
                    };
                }
            } else if (fileExtension === 'html') {
                // For HTML files, open directly
                const blob = new Blob([fileContent], { type: 'text/html' });
                const url = URL.createObjectURL(blob);
                const newWindow = window.open(url, '_blank');
                
                // Clean up the URL object after the window is closed
                if (newWindow) {
                    newWindow.onbeforeunload = () => {
                        URL.revokeObjectURL(url);
                    };
                }
            } else if (fileExtension === 'css') {
                // For CSS files, create a test HTML file
                const htmlContent = `
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <title>CSS Preview</title>
                        <style>
                            ${fileContent}
                        </style>
                    </head>
                    <body>
                        <div class="container">
                            <h1>CSS Preview</h1>
                            <p>This is a paragraph with the applied styles.</p>
                            <button>Styled Button</button>
                            <div class="box">Styled Box</div>
                        </div>
                    </body>
                    </html>
                `;
                
                const blob = new Blob([htmlContent], { type: 'text/html' });
                const url = URL.createObjectURL(blob);
                const newWindow = window.open(url, '_blank');
                
                if (newWindow) {
                    newWindow.onbeforeunload = () => {
                        URL.revokeObjectURL(url);
                    };
                }
            } else {
                // For other file types, show output in a modal
                setRunOutput({
                    type: 'error',
                    message: `Execution not supported for .${fileExtension} files`
                });
            }
        } catch (error) {
            setRunOutput({
                type: 'error',
                message: `Error executing code: ${error.message}`
            });
        } finally {
            setIsRunning(false);
        }
    };

    return (
        <main className="h-screen min-h-screen w-screen flex bg-slate-900 text-slate-100">
            {/* Left Panel: Chat & Collaborators */}
            <section className="left relative flex flex-col h-full w-96 bg-gradient-to-br from-blue-900 via-slate-900 to-blue-800 shadow-2xl rounded-l-2xl border-r border-blue-900/70 backdrop-blur-md">
                {/* Header Box */}
                <header className="flex flex-col items-center p-4 w-full gap-2 bg-gradient-to-br from-blue-900 via-slate-900 to-blue-800 shadow-2xl rounded-l-2xl border-r border-blue-900/70 backdrop-blur-md">
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 bg-blue-100 text-blue-500 text-xs font-medium px-2 py-1 rounded-full">
                            <i className="ri-user-fill text-sm"></i>
                        </div>
                        <span className="text-lg font-semibold text-blue-500">{user?.email}</span>
                    </div>
                    <div className="flex flex-row items-center gap-2">
                        <div className="text-sm text-blue-300">Project:</div>
                        <div className="text-lg font-semibold text-blue-500">{project?.name}</div>
                    </div>

                    <div className="flex flex-row items-center justify-between w-full">
                        {/* Add Collaborator Button */}
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="flex gap-2 items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-md transition duration-200 transform hover:scale-105"
                        >
                            <i className="ri-user-add-line text-base"></i>
                            <span className="text-sm">Add Collaborator</span>
                        </button>

                        {/* Show Collaborators Button */}
                        <button
                            onClick={() => setIsSidePanelOpen(!isSidePanelOpen)}
                            className="flex gap-2 items-center px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg shadow-md transition duration-200 transform hover:scale-105"
                        >
                            <i className="ri-group-line text-base"></i>
                            <span className="text-sm">View Collaborators</span>
                        </button>
                    </div>

                </header>
                <div className="flex flex-col flex-grow h-0"> {/* This wraps the chat area and makes it fill the panel */}
                    {/* Chat Area */}
                    <div className="conversation-area flex flex-col h-full px-0 py-0 bg-slate-800 w-full max-w-[420px] min-w-[320px] rounded-2xl shadow-xl border border-slate-800 overflow-hidden">
                        {/* Header Bar */}
                        <div className="flex items-center justify-center gap-2 px-5 py-3 bg-slate-900 border-b border-slate-700">
                            <i className="ri-chat-3-line text-blue-400 text-xl"></i>
                            <span className="font-semibold text-blue-300 text-lg">Messages</span>
                        </div>
                        {/* Scrollable messages */}
                        <div
                            ref={messageBox}
                            className="flex-grow flex flex-col gap-7 px-4 py-4 overflow-y-auto w-full [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                            style={{ minHeight: '0' }}
                        >
                            {messages.map((msg, index) => {
                                console.log('Rendering message:', msg);
                                const isOutgoing = msg.sender?.email === user?.email;
                                const isAI = msg.sender?.type === 'ai' || msg.sender?.email === 'ai@assistant.com';
                                
                                return (
                                    <div
                                        key={msg._id || index}
                                        className={`flex flex-col ${isOutgoing ? 'items-end' : 'items-start'} group mb-4`}
                                    >
                                        <span className="text-xs text-slate-400 mb-1 ml-2 mr-2">
                                            {isAI ? 'AI Assistant' : msg.sender?.email}
                                        </span>
                                        <div
                                            className={`
                                                max-w-xs md:max-w-md
                                                ${isAI 
                                                    ? 'w-full' 
                                                    : `px-5 py-3 rounded-2xl shadow-lg text-base font-medium whitespace-pre-wrap break-words
                                                       transition-all duration-200
                                                       ${isOutgoing
                                                            ? 'bg-slate-700 text-blue-100 border border-slate-600 rounded-br-3xl rounded-tr-2xl'
                                                            : 'bg-blue-900 text-blue-200 border border-blue-700 rounded-bl-3xl rounded-tl-2xl'}
                                                       group-hover:shadow-xl`
                                                }
                                            `}
                                        >
                                            {isAI ? writeAiMessage(msg.message) : msg.message}
                                        </div>
                                        <span className="text-xs text-slate-500 mt-1">
                                            {new Date(msg.timestamp).toLocaleTimeString()}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                        {/* Fixed input at the bottom */}
                        <div className="w-full flex justify-center pt-2 pb-2 bg-slate-900 border-t border-slate-700">
                            <div className="flex w-full max-w-[400px] gap-2">
                                <input
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') send() }}
                                    className="flex-grow px-4 py-3 rounded-l-xl border border-slate-700 outline-none focus:ring-2 focus:ring-blue-400 bg-slate-800 text-blue-100 shadow focus:bg-slate-900 transition"
                                    type="text" placeholder="Enter message"
                                />
                                <button
                                    onClick={send}
                                    className="px-7 bg-blue-500 hover:bg-blue-600 text-white rounded-r-xl shadow transition"
                                >
                                    <i className="ri-send-plane-fill"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                {/* Side Panel: Collaborators */}
                <div className={`sidePanel w-full h-full flex flex-col gap-2 bg-slate-800 shadow-xl absolute transition-all duration-300 z-30 ${isSidePanelOpen ? 'left-0' : '-left-full'} top-0 rounded-l-2xl`}>
                    <header className="flex justify-between items-center p-4 w-full bg-gradient-to-br from-blue-900 via-slate-900 to-blue-800 shadow-2xl rounded-l-2xl border-r border-blue-900/70 backdrop-blur-md">
                        <h1 className="font-semibold text-lg text-blue-300">Collaborators</h1>
                        <button onClick={() => setIsSidePanelOpen(!isSidePanelOpen)} className="p-2 rounded-full hover:bg-slate-700 transition">
                            <i className="ri-close-fill text-xl"></i>
                        </button>
                    </header>
                    <div className="flex flex-col gap-2 p-4 overflow-y-auto">
                        {(!project.users || project.users.length === 0) && (
                            <div className="text-slate-500 text-center py-4">No collaborators found for this project.</div>
                        )}
                        {project.users && project.users.map((u, idx) => {
                            const userObj = typeof u === 'object' && u.email ? u : users.find(usr => usr._id === (u._id || u));
                            if (!userObj) return null;
                            return (
                                <div key={userObj._id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-700 transition">
                                    <div className="w-8 h-8 rounded-full bg-blue-900 flex items-center justify-center text-blue-300 font-bold">
                                        {userObj.email[0].toUpperCase()}
                                    </div>
                                    <span className="text-slate-100">{userObj.email}</span>
                                    <span className={`ml-auto px-2 py-1 rounded-full text-xs font-semibold ${idx === 0 ? 'bg-yellow-200 text-yellow-800' : 'bg-slate-700 text-slate-300'}`}>{idx === 0 ? 'Owner' : 'Member'}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
                {/* Collaborator Modal */}
                {isModalOpen && (
                    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
                        <div className="bg-slate-800 rounded-2xl shadow-2xl p-8 w-full max-w-md border border-slate-700">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl font-bold text-blue-300">Add Collaborators</h2>
                                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-200 transition p-2 hover:bg-slate-700 rounded-lg">
                                    <i className="ri-close-line text-2xl"></i>
                                </button>
                            </div>
                            <div className="flex flex-col gap-2 max-h-60 overflow-y-auto mb-4">
                                {usersNotInProject.length === 0 && (
                                    <div className="text-slate-500 text-center py-4">All users are already collaborators.</div>
                                )}
                                {usersNotInProject.map((u) => (
                                    <button
                                        key={u._id}
                                        onClick={() => handleUserClick(u._id)}
                                        className={`flex items-center gap-3 p-2 rounded-lg border transition ${selectedUserId.has(u._id) ? 'bg-blue-900 border-blue-400 text-blue-300' : 'bg-slate-800 border-slate-700 text-slate-100'} hover:bg-blue-800`}
                                    >
                                        <div className="w-8 h-8 rounded-full bg-blue-900 flex items-center justify-center text-blue-300 font-bold">
                                            {u.email[0].toUpperCase()}
                                        </div>
                                        <span>{u.email}</span>
                                        {selectedUserId.has(u._id) && <i className="ri-check-line ml-auto text-blue-400"></i>}
                                    </button>
                                ))}
                            </div>
                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded-lg transition"
                                >Cancel</button>
                                <button
                                    onClick={addCollaborators}
                                    className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg shadow transition"
                                    disabled={selectedUserId.size === 0 || usersNotInProject.length === 0}
                                >Add</button>
                            </div>
                        </div>
                    </div>
                )}
            </section>
            {/* File Explorer & Code Editor */}
            <section className="flex flex-grow h-full">
                {/* File Explorer */}
                <div className="explorer h-full w-64 bg-slate-800/50 border-r border-slate-700/50 shadow-lg flex flex-col">
                    {/* File Explorer Header */}
                    <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-slate-800 to-slate-900 border-b border-slate-700/50">
                        <div className="flex items-center gap-2">
                            <RiFolder3Line className="text-blue-400" />
                            <span className="text-sm font-medium text-blue-300">Files</span>
                        </div>
                        <button 
                            onClick={() => setIsCreatingFile(true)}
                            className="p-1.5 hover:bg-slate-700/50 rounded-lg transition-colors"
                            title="New File (Ctrl/Cmd + N)"
                        >
                            <RiAddLine className="text-slate-400 hover:text-blue-400" />
                        </button>
                    </div>

                    {/* New File Input */}
                    {isCreatingFile && (
                        <div className="p-2 border-b border-slate-700/50">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newFileName}
                                    onChange={(e) => setNewFileName(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleCreateFile();
                                        if (e.key === 'Escape') setIsCreatingFile(false);
                                    }}
                                    placeholder="Enter file name..."
                                    className="flex-grow px-3 py-1.5 bg-slate-700/50 border border-slate-600 rounded text-sm text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    autoFocus
                                />
                                <button
                                    onClick={handleCreateFile}
                                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors"
                                >
                                    Create
                                </button>
                            </div>
                        </div>
                    )}

                    {/* File Tree */}
                    <div className="flex-grow overflow-y-auto p-2 space-y-1">
                        {renderFileTree(fileTree)}
                    </div>
                </div>

                {/* Code Editor */}
                <div ref={resizerRef} style={{ width: editorWidth, minWidth: 300, maxWidth: 900, transition: isResizing ? 'none' : 'width 0.2s' }} className="code-editor flex flex-col flex-grow h-full bg-slate-900 relative">
                    {/* Run Button */}
                    <div className="absolute top-2 right-2 z-20">
                        <button
                            onClick={executeCode}
                            disabled={!currentFile || isRunning}
                            className={`
                                flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg transition-all
                                ${isRunning 
                                    ? 'bg-slate-700 text-slate-400 cursor-not-allowed' 
                                    : 'bg-green-600 hover:bg-green-700 text-white transform hover:scale-105'
                                }
                            `}
                        >
                            <RiPlayLine className="text-lg" />
                            <span className="text-sm font-medium">
                                {isRunning ? 'Running...' : 'Run Code'}
                            </span>
                        </button>
                    </div>

                    {/* Editor Tabs */}
                    <div className="flex border-b border-slate-800 bg-slate-800/50 overflow-x-auto">
                        {openFiles.map((file) => (
                            <div 
                                key={file} 
                                className={`group flex items-center gap-2 px-4 py-2 border-r border-slate-700/50 min-w-[120px] max-w-[200px]
                                    ${currentFile === file 
                                        ? 'bg-slate-900 text-blue-300' 
                                        : 'bg-slate-800/50 text-slate-400 hover:text-slate-300'
                                    }`}
                            >
                                <button
                                    onClick={() => setCurrentFile(file)}
                                    className="flex items-center gap-2 focus:outline-none flex-grow min-w-0"
                                >
                                    <i className="ri-file-3-line text-sm flex-shrink-0"></i>
                                    <span className="text-sm truncate">{file}</span>
                                </button>
                                <button 
                                    onClick={() => handleCloseFile(file)}
                                    className="p-1 rounded hover:bg-red-900/50 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
                                >
                                    <i className="ri-close-line text-sm text-red-400 hover:text-red-300"></i>
                                </button>
                            </div>
                        ))}
                    </div>

                    {/* Editor Area */}
                    <div className="flex-grow flex w-full h-full bg-slate-900/80 rounded-2xl shadow-xl border border-slate-700/60 overflow-hidden">
                        {/* Line Numbers */}
                        <div
                            ref={lineNumberRef}
                            className="line-numbers bg-slate-800/70 border-r border-slate-700/50 text-slate-500 text-sm font-mono select-none overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                            style={{
                                width: '3rem',
                                userSelect: 'none',
                                textAlign: 'right',
                                height: '100%',
                                position: 'relative',
                                background: 'linear-gradient(90deg, #1e293b 90%, #334155 100%)',
                                lineHeight: '1.5em',
                                fontSize: '14px'
                            }}
                        >
                            {getFileNodeByPath(fileTree, currentFile)?.contents?.split('\n').map((_, i) => (
                                <div
                                    key={i}
                                    style={{ 
                                        height: '1.5em', 
                                        lineHeight: '1.5em', 
                                        transition: 'background 0.2s',
                                        padding: '0 0.5rem'
                                    }}
                                    className={`${activeLine === i + 1 ? 'bg-blue-900/40 text-blue-300 font-bold' : 'hover:bg-slate-700/40'}`}
                                >
                                    {i + 1}
                                </div>
                            ))}
                        </div>

                        {/* Code Editor */}
                        <div
                            className="flex-grow h-full overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                            style={{ position: 'relative' }}
                        >
                            <textarea
                                ref={textareaRef}
                                className="w-full h-full min-h-0 px-4 py-4 border-none outline-none font-mono text-sm bg-transparent text-slate-200 resize-none focus:ring-0 focus:outline-none"
                                value={getFileNodeByPath(fileTree, currentFile)?.contents || ''}
                                onChange={(e) => {
                                    // Update the nested fileTree immutably
                                    const updateTree = (tree, pathArr, value) => {
                                        if (pathArr.length === 1) {
                                            if (tree[pathArr[0]]?.file) {
                                                return { ...tree, [pathArr[0]]: { ...tree[pathArr[0]], file: { ...tree[pathArr[0]].file, contents: value } } };
                                            } else if (tree[pathArr[0]]) {
                                                return { ...tree, [pathArr[0]]: { ...tree[pathArr[0]], contents: value } };
                                            }
                                            return tree;
                                        }
                                        const [head, ...rest] = pathArr;
                                        return {
                                            ...tree,
                                            [head]: {
                                                ...tree[head],
                                                contents: updateTree(tree[head].contents || tree[head], rest, value)
                                            }
                                        };
                                    };
                                    setFileTree(prev => updateTree(prev, currentFile.split('/'), e.target.value));
                                    updateActiveLine();
                                }}
                                spellCheck="false"
                                style={{
                                    lineHeight: '1.5em',
                                    tabSize: 4,
                                    fontFamily: 'Fira Mono, Menlo, Monaco, Consolas, monospace',
                                    height: '100%',
                                    minHeight: 0,
                                    resize: 'none',
                                    overflow: 'auto',
                                    background: 'transparent',
                                    fontSize: '14px',
                                    padding: '0.5rem'
                                }}
                                onScroll={handleEditorScroll}
                                onClick={updateActiveLine}
                                onKeyUp={updateActiveLine}
                            />
                        </div>
                    </div>

                    {/* Run Output Modal */}
                    {runOutput && (
                        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
                            <div className="bg-slate-800 rounded-2xl shadow-2xl p-6 w-full max-w-2xl border border-slate-700">
                                <div className="flex justify-between items-center mb-4">
                                    <h2 className="text-xl font-bold text-blue-300">Execution Output</h2>
                                    <button 
                                        onClick={() => setRunOutput(null)}
                                        className="text-slate-400 hover:text-slate-200 transition p-2 hover:bg-slate-700 rounded-lg"
                                    >
                                        <i className="ri-close-line text-2xl"></i>
                                    </button>
                                </div>
                                <div className={`p-4 rounded-lg ${
                                    runOutput.type === 'error' 
                                        ? 'bg-red-900/20 border border-red-800 text-red-300' 
                                        : 'bg-green-900/20 border border-green-800 text-green-300'
                                }`}>
                                    <pre className="whitespace-pre-wrap font-mono text-sm">
                                        {runOutput.message}
                                    </pre>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </section>
        </main>
    );
};

export default Project;
