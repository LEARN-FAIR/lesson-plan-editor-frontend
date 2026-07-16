export interface LessonPlan {
    name: string;
    title?: string;
    path: string;
    sha: string;
    content: string | null;
    decoded_content: string | null;
    html_url: string;
    category?: {
        title: string;
        number: number;
    };
}