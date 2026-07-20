import React, {useState} from 'react';
import type {FairMarkdownDocument} from '../types';
import SinglePageEditor from '../components/editor/SinglePageEditor';
import {Button} from '../components/ui/button';

// TEMPORARY dev-only preview harness for the redesigned editor (no GitHub/auth).
const MOCK_DOC: FairMarkdownDocument = {
    number: 'LP-042',
    title: 'Introduction to FAIR Data Management',
    status: 'ready_for_review',
    layout: 'lesson-plan',
    authors: ['Maria Chen', 'Devon Osei'],
    reviewers: ['Amara Singh'],
    description:
        'A hands-on session introducing the FAIR principles and how they apply to everyday research data management decisions.',
    fair_elements: ['F', 'A', 'I'],
    learning_outcomes: {
        '1': {
            outcome: 'Explain the four FAIR principles and why they matter for research data.',
            verbs: [
                {verb: 'Explain', level: 'beginner'},
                {verb: 'Summarize', level: 'beginner'},
            ],
        },
        '2': {
            outcome: 'Apply metadata standards to describe a dataset for discovery.',
            verbs: [
                {verb: 'Apply', level: 'intermediate'},
                {verb: 'Annotate', level: 'intermediate'},
            ],
        },
        '3': {
            outcome: 'Evaluate a data management plan against FAIR criteria.',
            verbs: [{verb: 'Evaluate', level: 'expert'}],
        },
    },
    activities: {
        before: [
            {learning_outcomes: [1], activities: 'Read the short FAIR primer and note two questions.', time: '15 min', type: 'Reading', level: 'beginner'},
        ],
        during: [
            {learning_outcomes: [1], activities: 'Group discussion on real-world FAIR failures.', time: '20 min', type: 'Discussion', level: 'beginner'},
            {learning_outcomes: [2], activities: 'Hands-on metadata tagging exercise using sample datasets.', time: '40 min', type: 'Workshop', level: 'intermediate'},
        ],
        after: [
            {learning_outcomes: [3], activities: 'Peer-review a data management plan using the FAIR checklist.', time: '30 min', type: 'Assignment', level: 'expert'},
        ],
    },
    prerequisites: ['Basic understanding of the research data lifecycle', 'Familiarity with spreadsheet software'],
    terms4FAIRskills: [],
    additionalResources: [
        {title: 'GO FAIR Initiative', author: 'GO FAIR', url: 'https://go-fair.org'},
        {title: 'The FAIR Guiding Principles for scientific data management', doi: '10.1038/sdata.2016.18'},
    ],
    content: '## Session outline\n\nWrite your markdown content here…',
};

const EditorPreview: React.FC = () => {
    const [doc, setDoc] = useState<FairMarkdownDocument>(MOCK_DOC);
    const onChange = (u: Partial<FairMarkdownDocument>) => setDoc((prev) => ({...prev, ...u}));

    return (
        <div className="flex h-screen flex-col font-sans">
            <header
                className="flex flex-shrink-0 items-center justify-between px-8 py-[18px]"
                style={{background: 'linear-gradient(180deg, rgb(12,52,80), rgb(10,44,68))'}}
            >
                <div className="min-w-0">
                    <div className="text-lg font-semibold text-white">Lesson Plan Editor</div>
                    <div className="mt-1 flex items-center gap-2.5 text-xs text-white/65">
                        <span>learn-fair/lesson-plans</span>
                        <span className="opacity-50">•</span>
                        <span>main</span>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Button
                        variant="ghost"
                        className="h-9 border border-white/25 bg-white/10 text-white hover:bg-white/20 hover:text-white"
                    >
                        Export
                    </Button>
                    <Button variant="teal" className="h-9">Commit</Button>
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#4ebaaa] text-[12.5px] font-bold text-navy">
                        MC
                    </div>
                </div>
            </header>
            <SinglePageEditor document={doc} onDocumentChange={onChange} />
        </div>
    );
};

export default EditorPreview;
