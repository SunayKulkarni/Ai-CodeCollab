import React from 'react'
import AppRoutes from './routes/AppRoutes.jsx'
import { UserProvider } from './context/user.context.jsx'
import { EditorProvider } from './context/EditorContext.jsx'

const App = () => {
  return (
    <UserProvider>
      <EditorProvider>
        <AppRoutes />
      </EditorProvider>
    </UserProvider>
  )
}

export default App
