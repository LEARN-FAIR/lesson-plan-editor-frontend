import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import {QueryClientProvider} from '@tanstack/react-query';
import queryClient from './services/queryClient';

// Add Buffer polyfill for gray-matter (needed in browser environment)
import {Buffer} from 'buffer';

window.Buffer = Buffer;

const root = ReactDOM.createRoot(
    document.getElementById('root') as HTMLElement
);
root.render(
    <QueryClientProvider client={queryClient}>
        <App/>
    </QueryClientProvider>
);