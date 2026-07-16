import matter from 'gray-matter';
import type {FairMarkdownDocument} from '../types';

/**
 * Parse a markdown document with YAML frontmatter into structured data
 * @param markdown Raw markdown content with frontmatter
 * @returns Structured document object
 */
export const parseMarkdown = (markdown: string): FairMarkdownDocument => {
    const {data, content} = matter(markdown);

    return {
        ...data,
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
