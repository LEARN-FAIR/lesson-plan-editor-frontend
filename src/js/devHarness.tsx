import React, {useState} from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import './globals.css';
import {QueryClientProvider} from '@tanstack/react-query';
import {Buffer} from 'buffer';
import queryClient from './services/queryClient';
import customContributorService from './services/customContributorService';
import SinglePageEditor from './components/editor/SinglePageEditor';
import type {FairMarkdownDocument} from './types';

window.Buffer = Buffer;

// Seed a few contributors so the author/reviewer search-first drawer has a list.
[
    {id: '0000-0001-2345-6789', orcid: '0000-0001-2345-6789', firstName: 'Ada', lastName: 'Lovelace'},
    {id: '0000-0002-1111-2222', orcid: '0000-0002-1111-2222', firstName: 'Alan', lastName: 'Turing'},
    {id: 'grace-hopper', firstName: 'Grace', lastName: 'Hopper'},
    {id: '0000-0003-3333-4444', orcid: '0000-0003-3333-4444', firstName: 'Katherine', lastName: 'Johnson'},
].forEach((c) => customContributorService.addCustomContributor(c));

const initialDoc: FairMarkdownDocument = {
    number: 'LP-001',
    title: 'Introduction to FAIR data',
    status: 'draft',
    layout: 'lesson-plan',
    authors: ['Jane Doe', 'John Smith'],
    reviewers: ['Alice Reviewer'],
    summary: 'A short intro lesson plan.',
    fair_elements: ['F', 'A'],
    learning_outcomes: [
        {title: 'Explain what FAIR means', levels: ['beginner']},
        {title: 'Apply FAIR principles to a dataset', levels: ['intermediate']},
    ],
    activities: {
        before: [{learning_outcomes: [1], description: 'Read the intro article', duration_min: 15, type: 'reading', level: 'beginner'}],
        during: [
            {learning_outcomes: [1], description: 'Group discussion', duration_min: 30, type: 'discussion', level: 'beginner'},
            {learning_outcomes: [2], description: 'Hands-on dataset exercise', duration_min: 45, type: 'workshop', level: 'intermediate'},
        ],
        after: [],
    },
    prerequisites: ['Basic data literacy', 'Familiarity with spreadsheets'],
    terms4FAIRskills: [],
    sources: [
        {authors: 'GO FAIR', title: 'FAIR principles', type: 'Internet', url: 'https://www.go-fair.org/fair-principles/', accessed: '2026-09-01'},
    ],
    additionalResources: [
        {title: 'GO FAIR', url: 'https://www.go-fair.org'},
        {title: 'FAIR Guiding Principles', doi: '10.1038/sdata.2016.18', authors: 'Wilkinson et al.'},
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
