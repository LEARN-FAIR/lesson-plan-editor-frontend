import React from 'react';
import {useLocation} from 'react-router-dom';
import {useAuth} from '../contexts/AuthContext';
import {PageSpinner} from './ui/spinner';

interface LayoutProps {
    children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({children}) => {
    const location = useLocation();
    const {isLoading} = useAuth();

    // Public paths render immediately, without waiting on the auth-status probe.
    const isPublicPage =
        location.pathname === '/login' ||
        location.pathname === '/github-callback' ||
        location.pathname.startsWith('/suggest');

    // While auth state is resolving, render a minimal loading layout.
    if (isLoading && !isPublicPage) {
        return <PageSpinner />;
    }

    return <div className="flex min-h-screen flex-col font-sans text-foreground">{children}</div>;
};

export default Layout;
