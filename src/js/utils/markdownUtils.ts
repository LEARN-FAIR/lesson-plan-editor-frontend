import matter from 'gray-matter';
import type {FairMarkdownDocument} from '../types';

type YamlErrorMark = {
    line?: unknown;
    column?: unknown;
};

type YamlParseError = {
    reason?: unknown;
    mark?: YamlErrorMark;
};

/** Error shown when a lesson's YAML front matter cannot be parsed. */
export class MarkdownParseError extends Error {
    readonly reason?: string;
    readonly line?: number;
    readonly column?: number;

    constructor(message: string, reason?: string, line?: number, column?: number) {
        super(message);
        this.name = 'MarkdownParseError';
        this.reason = reason;
        this.line = line;
        this.column = column;
    }
}

const formatParseError = (error: unknown): MarkdownParseError => {
    const yamlError = error as YamlParseError;
    const reason = typeof yamlError?.reason === 'string' ? yamlError.reason : undefined;
    const line = typeof yamlError?.mark?.line === 'number' ? yamlError.mark.line + 1 : undefined;
    const column = typeof yamlError?.mark?.column === 'number' ? yamlError.mark.column + 1 : undefined;
    const location = line ? ` at line ${line}${column ? `, column ${column}` : ''}` : '';

    return new MarkdownParseError(
        `The YAML front matter could not be read${location}.`,
        reason,
        line,
        column,
    );
};

/**
 * The YAML parser turns bare dates (`accessed: 2026-09-01`, `last_updated`)
 * into Date objects, which would be written back as full ISO timestamps.
 * Keep them as plain `YYYY-MM-DD` strings so they round-trip.
 */
const keepDatesAsStrings = (value: unknown): unknown => {
    if (value instanceof Date) return value.toISOString().slice(0, 10);
    if (Array.isArray(value)) return value.map(keepDatesAsStrings);
    if (value && typeof value === 'object') {
        return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, keepDatesAsStrings(item)]));
    }
    return value;
};

/**
 * Parse a markdown document with YAML frontmatter into structured data
 * @param markdown Raw markdown content with frontmatter
 * @returns Structured document object
 */
export const parseMarkdown = (markdown: string): FairMarkdownDocument => {
    let data: Record<string, unknown>;
    let content: string;

    try {
        ({data, content} = matter(markdown));
    } catch (error) {
        throw formatParseError(error);
    }

    return {
        ...(keepDatesAsStrings(data) as Record<string, unknown>),
        content: content.trim(),
    } as FairMarkdownDocument;
};

/**
 * Serialize structured data back into a markdown document with frontmatter
 * @param document Structured document object
 * @returns Raw markdown content with frontmatter
 */
export const serializeMarkdown = (document: FairMarkdownDocument): string => {
    const {content, ...frontmatter} = document;

    return matter.stringify(content, frontmatter);
};
