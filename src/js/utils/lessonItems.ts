import type {Activity, FairMarkdownDocument, Resource} from '../types';

/**
 * Enumerate a parsed lesson plan into the grouped options used by the public
 * "Suggest changes" form, and map an option's value back to its current text.
 */

export interface FieldOption {
    /** Encodes the item locator, e.g. 'description', 'outcome-1', 'activity-before-0', 'resource-2', 'other'. */
    value: string;
    label: string;
}

export interface FieldGroup {
    group: string;
    items: FieldOption[];
}

export interface SuggestionChange {
    field: string;
    label: string;
    current: string;
    proposed: string;
    reason: string;
}

export interface SuggestionPayload {
    lessonPlan: {category: string; lesson: string; title: string};
    changes: SuggestionChange[];
}

const STATUS_LABELS: Record<string, string> = {
    draft: 'Draft',
    ready_for_review: 'Ready for review',
    published: 'Published',
};

const activityText = (a: Activity): string => [a.title, a.description].filter(Boolean).join(' — ');

const resourceMeta = (r: Pick<Resource, 'authors' | 'url' | 'doi'>): string =>
    [r.authors, r.doi ? `DOI: ${r.doi}` : r.url].filter(Boolean).join(' · ');

const truncate = (text: string, max = 60): string => {
    const clean = (text || '').trim().replace(/\s+/g, ' ');
    return clean.length > max ? `${clean.slice(0, max).trimEnd()}…` : clean;
};

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Build the `<optgroup>`-style option groups from a lesson plan document. */
export const buildFieldGroups = (doc: FairMarkdownDocument): FieldGroup[] => {
    const groups: FieldGroup[] = [
        {
            group: 'General',
            items: [
                {value: 'title', label: 'Title'},
                {value: 'number', label: 'Number'},
                {value: 'description', label: 'Summary'},
                {value: 'status', label: 'Status'},
            ],
        },
    ];

    const outcomes = doc.learning_outcomes || [];
    if (outcomes.length) {
        groups.push({
            group: 'Learning outcomes',
            items: outcomes.map((o, i) => ({
                value: `outcome-${i + 1}`,
                label: `Outcome ${i + 1} — ${truncate(o?.title || '')}`,
            })),
        });
    }

    const prerequisites = doc.prerequisites || [];
    if (prerequisites.length) {
        groups.push({
            group: 'Prerequisites',
            items: prerequisites.map((p, i) => ({value: `prerequisite-${i}`, label: truncate(p)})),
        });
    }

    const activityItems: FieldOption[] = [];
    (['before', 'during', 'after'] as const).forEach((section) => {
        (doc.activities?.[section] || []).forEach((a, i) => {
            activityItems.push({
                value: `activity-${section}-${i}`,
                label: `${cap(section)} — ${truncate(activityText(a))}`,
            });
        });
    });
    if (activityItems.length) groups.push({group: 'Activities', items: activityItems});

    const sources = doc.sources || [];
    if (sources.length) {
        groups.push({
            group: 'Sources',
            items: sources.map((r, i) => ({value: `source-${i}`, label: truncate(r.title)})),
        });
    }

    const resources = doc.additionalResources || [];
    if (resources.length) {
        groups.push({
            group: 'Resources',
            items: resources.map((r, i) => ({value: `resource-${i}`, label: truncate(r.title)})),
        });
    }

    groups.push({
        group: 'Other',
        items: [
            {value: 'content', label: 'Lesson content (body)'},
            {value: 'other', label: 'Something else'},
        ],
    });

    return groups;
};

/** The current text for a given option value (used as the read-only "Current" block + prefill). */
export const currentText = (doc: FairMarkdownDocument, value: string): string => {
    switch (value) {
        case 'title':
            return doc.title || '';
        case 'number':
            return doc.number || '';
        case 'description':
            return doc.summary ?? doc.description ?? '';
        case 'status':
            return STATUS_LABELS[doc.status] || doc.status || '';
        case 'content':
            return doc.content || '';
        case 'other':
            return '';
    }

    const outcomeMatch = value.match(/^outcome-(.+)$/);
    if (outcomeMatch) return doc.learning_outcomes?.[parseInt(outcomeMatch[1], 10) - 1]?.title || '';

    const prereqMatch = value.match(/^prerequisite-(\d+)$/);
    if (prereqMatch) return doc.prerequisites?.[parseInt(prereqMatch[1], 10)] || '';

    const activityMatch = value.match(/^activity-(before|during|after)-(\d+)$/);
    if (activityMatch) {
        const a = doc.activities?.[activityMatch[1] as 'before' | 'during' | 'after']?.[
            parseInt(activityMatch[2], 10)
        ];
        return a ? activityText(a) : '';
    }

    const resourceMatch = value.match(/^(resource|source)-(\d+)$/);
    if (resourceMatch) {
        const list = resourceMatch[1] === 'source' ? doc.sources : doc.additionalResources;
        const r = list?.[parseInt(resourceMatch[2], 10)];
        if (!r) return '';
        const meta = resourceMeta(r);
        return meta ? `${r.title}\n${meta}` : r.title;
    }

    return '';
};

/** Flatten groups into a single option list (for summary label lookups). */
export const flattenFieldOptions = (groups: FieldGroup[]): FieldOption[] => groups.flatMap((g) => g.items);
