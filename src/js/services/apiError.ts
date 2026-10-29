/**
 * Structured API error surfaced by the backend.
 *
 * The backend returns errors as `{ error: true, message, code? }`, where `code`
 * is a stable, machine-readable identifier. Callers switch on `code` (via the
 * exported constants) instead of matching the human-readable `message`.
 */

export const ApiErrorCode = {
    GithubAppNotAuthorized: 'github_app_not_authorized',
    GithubApiError: 'github_api_error',
} as const;

export type ApiErrorCode = (typeof ApiErrorCode)[keyof typeof ApiErrorCode];

export class ApiError extends Error {
    readonly code?: string;
    readonly status?: number;

    constructor(message: string, code?: string, status?: number) {
        super(message);
        this.name = 'ApiError';
        this.code = code;
        this.status = status;
    }

    is(code: ApiErrorCode): boolean {
        return this.code === code;
    }
}

export const isApiError = (error: unknown): error is ApiError => error instanceof ApiError;

/** Build an ApiError from a parsed `{ message, error, code }` body + HTTP status. */
export const apiErrorFromBody = (
    body: {message?: unknown; error?: unknown; code?: unknown},
    status: number,
    fallbackMessage: string,
): ApiError => {
    const message =
        (typeof body.message === 'string' && body.message)
        || (typeof body.error === 'string' ? body.error : '')
        || fallbackMessage;
    const code = typeof body.code === 'string' ? body.code : undefined;
    return new ApiError(message, code, status);
};
