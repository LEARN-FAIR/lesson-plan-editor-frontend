import {BrowserRouter as Router, Navigate, Route, Routes} from 'react-router-dom';

// Pages
import EditorPage from './pages/EditorPage';
import SetupPage from './pages/SetupPage';
import LoginPage from './pages/LoginPage';
import SuggestChangesPage from './pages/SuggestChangesPage';
import EditorPreview from './pages/EditorPreview'; // TEMP: redesign preview harness

// Components
import GitHubCallback from './pages/GitHubCallback';
import ProtectedRoute from './components/navigation/ProtectedRoute';
import Layout from './components/Layout';

// Context
import {AuthProvider} from './contexts/AuthContext';

function App() {
    return (
        <AuthProvider>
            <Router>
                <Layout>
                    <Routes>
                        {/* TEMP: redesign preview (no auth) */}
                        <Route path="/preview-editor" element={<EditorPreview/>}/>

                        {/* Public "Suggest changes" form (no auth required to draft) */}
                        <Route path="/suggest/:category/:lesson" element={<SuggestChangesPage/>}/>

                        {/* Login Page Route */}
                        <Route path="/login" element={<LoginPage/>}/>

                        {/* Setup Page Route */}
                        <Route path="/" element={<ProtectedRoute element={<SetupPage/>}/>}/>

                        {/* Editor Page Route */}
                        <Route
                            path="/editor/:owner/:repo/:branch/:lesson"
                            element={<ProtectedRoute element={<EditorPage/>}/>}
                        />
                        {/* Legacy layout: _lesson-plans/<category>/topics/<lesson> */}
                        <Route
                            path="/editor/:owner/:repo/:branch/:category/:lesson"
                            element={<ProtectedRoute element={<EditorPage/>}/>}
                        />

                        {/* GitHub OAuth Callback */}
                        <Route path="/github-callback" element={<GitHubCallback/>}/>

                        {/* Catch-all redirect */}
                        <Route path="*" element={<Navigate to="/" replace/>}/>
                    </Routes>
                </Layout>
            </Router>
        </AuthProvider>
    );
}

export default App;
