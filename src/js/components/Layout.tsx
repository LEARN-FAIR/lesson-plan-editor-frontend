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

    const isAuthPage = location.pathname === '/login' || location.pathname === '/github-callback';

    // While auth state is resolving, render a minimal loading layout.
    if (isLoading && !isAuthPage) {
        return <PageSpinner />;
    }

    return <div className="flex min-h-screen flex-col font-sans text-foreground">{children}</div>;
};

export default Layout;
