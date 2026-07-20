import type {Contributor} from '../../services/contributorService';

/** The seven jump-nav sections of the single-page editor. */
export type SectionKey =
    | 'general'
    | 'authors'
    | 'outcomes'
    | 'activities'
    | 'prerequisites'
    | 'resources'
    | 'content';

export interface SectionMeta {
    key: SectionKey;
    label: string;
    num: number;
}

export const SECTIONS_META: SectionMeta[] = [
    {key: 'general', label: 'General info', num: 1},
    {key: 'authors', label: 'Authors', num: 2},
    {key: 'outcomes', label: 'Outcomes', num: 3},
    {key: 'activities', label: 'Activities', num: 4},
    {key: 'prerequisites', label: 'Prerequisites', num: 5},
    {key: 'resources', label: 'Resources', num: 6},
    {key: 'content', label: 'Content', num: 7},
];

/**
 * Describes which slide-over drawer form is open. `mode` distinguishes adding a
 * new item from editing an existing one; the optional locators pin the edit
 * target inside the document model.
 */
export interface DrawerRequest {
    type: 'author' | 'reviewer' | 'outcome' | 'activity' | 'prerequisite' | 'resource';
    mode: 'add' | 'edit';
    /** Activity subgroup the item belongs to. */
    section?: 'before' | 'during' | 'after';
    /** Array index for prerequisite / resource / activity edits. */
    index?: number;
    /** Outcome map key for outcome edits. */
    outcomeKey?: string;
}

export type OpenDrawer = (request: DrawerRequest) => void;

/** Derive up-to-two uppercase initials from a display name. */
export const initialsOf = (name: string): string =>
    name
        .trim()
        .split(/\s+/)
        .map((p) => p[0] || '')
        .join('')
        .slice(0, 2)
        .toUpperCase();

/** Resolve a stored author/reviewer id to a display name + ORCID label. */
export interface ResolvedAuthor {
    id: string;
    name: string;
    orcid: string;
    orcidLabel: string;
}

export const resolveAuthor = (id: string, contributors: Contributor[]): ResolvedAuthor => {
    const contributor = contributors.find((c) => c.id === id);
    if (contributor) {
        const orcid = contributor.orcid || (contributor.id.startsWith('0000-') ? contributor.id : '');
        return {
            id,
            name: `${contributor.firstName} ${contributor.lastName}`.trim(),
            orcid,
            orcidLabel: orcid || 'No ORCID on file',
        };
    }
    // Not found in the contributor list: the id is either a raw ORCID or a raw name.
    if (id.startsWith('0000-')) {
        return {id, name: id, orcid: id, orcidLabel: id};
    }
    return {id, name: id, orcid: '', orcidLabel: 'No ORCID on file'};
};
