// Types for the FAIR markdown document structure

// Basic types
export interface Author {
    id: string;  // ORCID or name
}

export interface LearningVerbLevel {
    verb: string;
    level: 'beginner' | 'intermediate' | 'expert';
}

export interface LearningOutcome {
    outcome: string;
    verbs: LearningVerbLevel[];
}

export interface Activity {
    /**
     * @deprecated Use `learning_outcomes` instead. Retained only so existing
     * content that still uses the single-value field keeps working.
     */
    learning_outcome?: number;
    learning_outcomes?: number[];
    activities: string | string[];
    time: string;
    type: string;
    level: 'beginner' | 'intermediate' | 'expert';
}

export interface Resource {
    title: string;
    author?: string;
    url?: string;
    doi?: string;
    additionalInformation?: string;
}

export interface Term {
    subject: Array<{ uri: string; label: string }>;
    predicate: Array<{ uri: string; label: string }>;
    object: Array<{ uri: string; label: string }>;
}

// Main document structure
export interface FairMarkdownDocument {
    // Frontmatter
    number: string;
    title: string;
    status: string;
    layout: string;
    authors: string[];
    reviewers: string[];
    description: string;
    fair_elements: ('F' | 'A' | 'I' | 'R')[];
    learning_outcomes: Record<string, LearningOutcome>;
    activities: {
        before: Activity[];
        during: Activity[];
        after: Activity[];
    };
    prerequisites: string[];
    terms4FAIRskills: Term[];
    additionalResources: Resource[];

    // Content (after the frontmatter)
    content: string;
}
