// Types for the FAIR markdown document structure.
// Mirrors the canonical lesson plan front matter documented in the
// ELIXIR-TrP-FAIR-Converge README.

// Basic types
export interface Author {
    id: string;  // ORCID or name
}

export type Level = 'beginner' | 'intermediate' | 'expert';

export interface LearningOutcome {
    title: string;
    body?: string;
    levels?: Level[];
}

export interface Activity {
    title?: string;
    description: string;
    duration_min?: number;
    type: string;
    level: Level;
    /** 1-based positions in `learning_outcomes`. */
    learning_outcomes?: number[];
}

export interface Task {
    title: string;
    description?: string;
}

export interface Materials {
    participants?: string;
    trainer?: string;
}

/** Reference item rendered as a numbered Vancouver-style entry. */
export interface Reference {
    authors?: string;
    title: string;
    /** e.g. Internet, Journal article, Book */
    type?: string;
    journal?: string;
    publisher?: string;
    year?: number | string;
    volume?: number | string;
    number?: number | string;
    pages?: string;
    edition?: string;
    /** Bare DOI, e.g. 10.1038/sdata.2016.18 */
    doi?: string;
    url?: string;
    /** ISO date the web resource was accessed. */
    accessed?: string;
    note?: string;
}

export type Resource = Reference;

export interface Term {
    subject: Array<{ uri: string; label: string }>;
    predicate: Array<{ uri: string; label: string }>;
    object: Array<{ uri: string; label: string }>;
}

export type DeliveryFormat = 'in_person' | 'online' | 'hybrid' | 'self_paced';

// Main document structure
export interface FairMarkdownDocument {
    // Frontmatter
    number: string;
    title: string;
    status: string;
    layout: string;
    authors: string[];
    reviewers: string[];
    summary: string;
    /** Fallback for `summary`; kept so untouched files round-trip. */
    description?: string;
    fair_elements: ('F' | 'A' | 'I' | 'R')[];
    levels?: Level[];
    delivery_format?: DeliveryFormat;
    learning_outcomes: LearningOutcome[];
    activities: {
        before: Activity[];
        during: Activity[];
        after: Activity[];
    };
    tasks?: Task[];
    /** Legacy markdown form of `tasks`; shown read-only. */
    tasks_text?: string;
    materials?: Materials;
    take_home?: string;
    prerequisites: string[];
    terms4FAIRskills: Term[];
    sources?: Reference[];
    additionalResources: Resource[];

    // Managed outside the editor (Zenodo deposit script / Jekyll). Never edited
    // here, but always passed through untouched when saving.
    doi?: string;
    zenodo_concept_doi?: string;
    zenodo_hash?: string;
    permalink?: string;
    redirect_from?: string[];
    last_updated?: string;

    // Content (after the frontmatter)
    content: string;
}
