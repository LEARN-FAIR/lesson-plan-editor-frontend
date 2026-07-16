import React, {createContext, ReactNode, useContext, useState} from 'react';
import {useQueryClient} from '@tanstack/react-query';
import githubService from '../services/githubService';
import {useAuthStatus, useGitHubUserInfo} from '../services/authQueryHooks';
import {performLogout, refreshAuthState} from '../services/authService';

interface AuthContextType {
    isAuthenticated: boolean;
    isLoading: boolean;
    user: any | null;
    login: () => void;
    logout: () => void;
    setRedirectPath: (path: string) => void;
    getRedirectPath: () => string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({children}) => {
    const queryClient = useQueryClient();
    
    // Use React Query hooks for auth status and user info
    const { 
        data: authData,
        isLoading: isAuthLoading,
        isError: isAuthError
    } = useAuthStatus();
    
    const {
        data: userData,
        isLoading: isUserLoading
    } = useGitHubUserInfo();
    
    // Derive state from React Query results
    const isAuthenticated = authData?.authenticated || false;
    const user = userData || null;
    const isLoading = isAuthLoading || isUserLoading;
    
    // Update githubService with the latest auth state
    if (authData) {
        githubService.setAuthenticated(authData.authenticated);
    }
    
    // Update githubService with the latest user data
    if (userData) {
        githubService.setUser(userData);
    }

    const login = () => {
        githubService.redirectToGitHub();
    };

    const logout = async () => {
        // Use the performLogout utility which handles API call and cache invalidation
        await performLogout(queryClient);
    };

    const setRedirectPath = (path: string) => {
        localStorage.setItem('redirect_after_login', path);
    };

    const getRedirectPath = (): string => {
        return localStorage.getItem('redirect_after_login') || '/';
    };

    const value = {
        isAuthenticated,
        isLoading,
        user,
        login,
        logout,
        setRedirectPath,
        getRedirectPath
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
