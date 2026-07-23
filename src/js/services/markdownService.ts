/**
 * Markdown file service for handling file operations
 */

/**
 * Exports the markdown content as a file download
 * @param content The markdown content to export
 * @param filename Optional filename (path or basename) for the download
 */
export const exportMarkdownFile = (content: string, filename?: string): void => {
    // Use just the basename of whatever path/filename was provided.
    const finalFilename = filename?.split('/').pop() || 'lesson-plan.md';

    const blob = new Blob([content], {type: 'text/markdown'});
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = finalFilename;
    document.body.appendChild(a);
    a.click();

    // Clean up
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

/**
 * Gets the current filename for the markdown file
 * @param filePath The file path to use as filename
 * @returns The provided file path or empty string if not provided
 */
export const getCurrentFilename = (filePath?: string): string => {
    return filePath || '';
};
