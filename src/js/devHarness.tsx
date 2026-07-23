import React, {useState} from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import './globals.css';
import {QueryClientProvider} from '@tanstack/react-query';
import {Buffer} from 'buffer';
import queryClient from './services/queryClient';
import SinglePageEditor from './components/editor/SinglePageEditor';
import type {FairMarkdownDocument} from './types';

window.Buffer = Buffer;

const initialDoc: FairMarkdownDocument = {
    number: 'LP-001',
    title: 'Introduction to FAIR data',
    status: 'draft',
    layout: 'lesson-plan',
    authors: ['Jane Doe', 'John Smith'],
    reviewers: ['Alice Reviewer'],
    description: 'A short intro lesson plan.',
    fair_elements: ['F', 'A'],
    learning_outcomes: {
        '1': {outcome: 'Explain what FAIR means', verbs: [{verb: 'Explain', level: 'beginner'}]},
        '2': {outcome: 'Apply FAIR principles to a dataset', verbs: [{verb: 'Apply', level: 'intermediate'}]},
    },
    activities: {
        before: [{learning_outcomes: [1], activities: 'Read the intro article', time: '15 min', type: 'reading', level: 'beginner'}],
        during: [
            {learning_outcomes: [1], activities: 'Group discussion', time: '30 min', type: 'discussion', level: 'beginner'},
            {learning_outcomes: [2], activities: 'Hands-on dataset exercise', time: '45 min', type: 'workshop', level: 'intermediate'},
        ],
        after: [],
    },
    prerequisites: ['Basic data literacy', 'Familiarity with spreadsheets'],
    terms4FAIRskills: [],
    additionalResources: [
        {title: 'GO FAIR', url: 'https://www.go-fair.org'},
        {title: 'FAIR Guiding Principles', doi: '10.1038/sdata.2016.18', author: 'Wilkinson et al.'},
    ],
    content: '# Lesson content\n\nSome markdown here.',
};

const Harness: React.FC = () => {
    const [doc, setDoc] = useState(initialDoc);
    return (
        <div className="flex h-screen flex-col font-sans">
            <header className="flex flex-shrink-0 items-center px-8 py-[18px]" style={{background: 'linear-gradient(180deg, rgb(12,52,80), rgb(10,44,68))'}}>
                <div className="text-lg font-semibold text-white">Dev Harness — Editor</div>
            </header>
            <SinglePageEditor document={doc} onDocumentChange={(u) => setDoc((d) => ({...d, ...u}))} />
        </div>
    );
};

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <QueryClientProvider client={queryClient}>
        <Harness />
    </QueryClientProvider>,
);
