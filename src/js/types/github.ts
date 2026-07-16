// GitHub repository and branch types

export interface Repository {
    id: number;
    name: string;
    full_name: string;
    owner: {
        login: string;
        avatar_url: string;
    };
    description: string | null;
    html_url: string;
    fork: boolean;
    default_branch: string;
    permissions?: {
        admin: boolean;
        push: boolean;
        pull: boolean;
    };
    // Custom property for fork source information
    source?: {
        full_name: string;
    };
    url: string;
    created_at: string;
    updated_at: string;
    pushed_at: string;
    git_url: string;
    ssh_url: string;
    clone_url: string;
    homepage: string | null;
    size: number;
    stargazers_count: number;
    watchers_count: number;
    language: string | null;
    forks_count: number;
    archived: boolean;
    disabled: boolean;
    open_issues_count: number;
    license: {
        key: string;
        name: string;
        url: string;
    } | null;
    topics: string[];
    visibility: string;
    forks: number;
    open_issues: number;
    watchers: number;
}

export interface Branch {
    name: string;
    commit: {
        sha: string;
        url: string;
    };
    protected: boolean;
}
