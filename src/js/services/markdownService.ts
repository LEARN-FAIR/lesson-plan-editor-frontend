/**
 * Markdown file service for handling file operations
 */

/**
 * Exports the markdown content as a file download
 * @param content The markdown content to export
 * @param filename Optional filename override for the download
 */
export const exportMarkdownFile = (content: string, filename?: string): void => {
    // Import here to avoid circular dependency
    const lessonPlanService = require('./lessonPlanService').default;

    // Get the selected lesson plan and use its path if available
    const selectedLessonPlan = lessonPlanService.getSelectedLessonPlan();

    // Extract the actual filename from the path (get the last part after the last slash)
    let downloadFilename = '';

    if (selectedLessonPlan && selectedLessonPlan.path) {
        // Extract just the filename from the path
        const pathParts = selectedLessonPlan.path.split('/');
        downloadFilename = pathParts[pathParts.length - 1];
    }

    // Use provided filename if specified, otherwise use the extracted filename
    const finalFilename = filename || downloadFilename;

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
