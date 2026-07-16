import React, { useEffect } from 'react';
import {BrowserRouter as Router, Navigate, Route, Routes} from 'react-router-dom';
import {CssBaseline, ThemeProvider} from '@mui/material';
import theme from './theme/theme';

// Pages
import EditorPage from './pages/EditorPage';
import SetupPage from './pages/SetupPage';
import LoginPage from './pages/LoginPage';

// Components
import GitHubCallback from './pages/GitHubCallback';
import ProtectedRoute from './components/navigation/ProtectedRoute';
import Layout from './components/Layout';

// Context
import {AuthProvider} from './contexts/AuthContext';

function App() {
    return (
        <ThemeProvider theme={theme}>
            <AuthProvider>
                <Router>
                    <Layout>
                        <CssBaseline/>
                        <Routes>
                            {/* Login Page Route */}
                            <Route path="/login" element={<LoginPage/>}/>

                            {/* Setup Page Route */}
                            <Route path="/" element={<ProtectedRoute element={<SetupPage/>} />} />

                            {/* Editor Page Route */}
                            <Route path="/editor/:owner/:repo/:branch/:category/:lesson" element={<ProtectedRoute element={<EditorPage/>} />} />

                            {/* GitHub OAuth Callback */}
                            <Route path="/github-callback" element={<GitHubCallback/>}/>

                            {/* Catch-all redirect */}
                            <Route path="*" element={<Navigate to="/" replace/>}/>
                        </Routes>
                    </Layout>
                </Router>
            </AuthProvider>
        </ThemeProvider>
    );
}

export default App;
