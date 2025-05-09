import React, { createContext, useState, useContext } from 'react';

const EditorContext = createContext();

export const EditorProvider = ({ children }) => {
    const [fileTree, setFileTree] = useState({});
    const [currentFile, setCurrentFile] = useState(null);
    const [openFiles, setOpenFiles] = useState([]);

    const refreshFileTree = async () => {
        try {
            const response = await fetch('http://localhost:3001/api/files/list');
            if (!response.ok) {
                throw new Error('Failed to fetch file tree');
            }
            const data = await response.json();
            setFileTree(data.files);
        } catch (error) {
            console.error('Error refreshing file tree:', error);
        }
    };

    const setActiveFile = (filename) => {
        setCurrentFile(filename);
        setOpenFiles(prev => [...new Set([...prev, filename])]);
    };

    return (
        <EditorContext.Provider value={{
            fileTree,
            setFileTree,
            currentFile,
            setCurrentFile,
            openFiles,
            setOpenFiles,
            refreshFileTree,
            setActiveFile
        }}>
            {children}
        </EditorContext.Provider>
    );
};

export const useEditor = () => {
    const context = useContext(EditorContext);
    if (!context) {
        throw new Error('useEditor must be used within an EditorProvider');
    }
    return context;
}; 