import React, {useMemo, useState} from 'react';
import {ArrowLeft, ArrowRight, Check, Info, Pencil, Plus, X} from 'lucide-react';
import type {FairMarkdownDocument} from '../../types';
import {
    buildFieldGroups,
    currentText,
    flattenFieldOptions,
    type SuggestionPayload,
} from '../../utils/lessonItems';
import {Sheet, SheetContent} from '../ui/sheet';
import {Spinner} from '../ui/spinner';
import {cn} from '../../lib/utils';

interface Change {
    id: number;
    field: string;
    proposed: string;
    reason: string;
    touched: boolean;
}

interface SuggestChangesFormProps {
    document: FairMarkdownDocument;
    category: string;
    lesson: string;
    topicUrl?: string;
    isAuthenticated?: boolean;
    submitting?: boolean;
    submitError?: string | null;
    submitted?: boolean;
    submittedUrl?: string | null;
    /** Sign in with a provider then submit (unauthenticated visitor). */
    onSignIn?: (provider: 'github' | 'orcid', payload: SuggestionPayload) => void;
    /** Submit directly (visitor already has a session). */
    onSubmit?: (payload: SuggestionPayload) => void;
}

let UID = 0;

const GithubGlyph: React.FC = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 .5A11.5 11.5 0 0 0 .5 12a11.5 11.5 0 0 0 7.86 10.92c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.53-1.34-1.29-1.7-1.29-1.7-1.05-.72.08-.7.08-.7 1.17.08 1.78 1.2 1.78 1.2 1.04 1.78 2.73 1.27 3.4.97.1-.75.4-1.27.73-1.56-2.56-.29-5.26-1.28-5.26-5.7 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.8 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.12 3.05.74.81 1.18 1.84 1.18 3.1 0 4.43-2.7 5.4-5.28 5.69.42.36.79 1.08.79 2.18v3.23c0 .31.2.67.8.56A11.5 11.5 0 0 0 23.5 12 11.5 11.5 0 0 0 12 .5Z" />
    </svg>
);

const OrcidGlyph: React.FC = () => (
    <span
        className="flex h-[19px] w-[19px] items-center justify-center rounded-full text-[8.5px] font-extrabold tracking-tighter text-white"
        style={{background: '#a6ce39'}}
        aria-hidden="true"
    >
        iD
    </span>
);

const EYEBROW = 'text-[11px] font-bold uppercase tracking-[0.3px]';

const SuggestChangesForm: React.FC<SuggestChangesFormProps> = ({
    document: doc,
    category,
    lesson,
    topicUrl,
    isAuthenticated = false,
    submitting = false,
    submitError = null,
    submitted = false,
    submittedUrl = null,
    onSignIn,
    onSubmit,
}) => {
    const groups = useMemo(() => buildFieldGroups(doc), [doc]);
    const optionLabel = useMemo(() => {
        const flat = flattenFieldOptions(groups);
        return (value: string) => flat.find((o) => o.value === value)?.label || value;
    }, [groups]);

    const [changes, setChanges] = useState<Change[]>(() => [
        {id: ++UID, field: 'description', proposed: currentText(doc, 'description'), reason: '', touched: false},
    ]);
    const [signInOpen, setSignInOpen] = useState(false);

    const update = (id: number, patch: Partial<Change>) =>
        setChanges((prev) => prev.map((c) => (c.id === id ? {...c, ...patch} : c)));

    const changeField = (c: Change, value: string) =>
        update(c.id, {field: value, proposed: c.touched ? c.proposed : currentText(doc, value)});

    const addChange = () =>
        setChanges((prev) => [...prev, {id: ++UID, field: 'other', proposed: '', reason: '', touched: false}]);

    const removeChange = (id: number) => setChanges((prev) => prev.filter((c) => c.id !== id));

    const filledCount = changes.filter((c) => c.proposed.trim()).length;
    const canSubmit = filledCount > 0;

    const buildPayload = (): SuggestionPayload => ({
        lessonPlan: {category, lesson, title: doc.title},
        changes: changes
            .filter((c) => c.proposed.trim())
            .map((c) => ({
                field: c.field,
                label: optionLabel(c.field),
                current: currentText(doc, c.field),
                proposed: c.proposed.trim(),
                reason: c.reason.trim(),
            })),
    });

    const openSignIn = () => {
        if (canSubmit) setSignInOpen(true);
    };

    const handleProvider = (provider: 'github' | 'orcid') => {
        const payload = buildPayload();
        if (isAuthenticated) {
            onSubmit?.(payload);
        } else {
            onSignIn?.(provider, payload);
        }
    };

    /* ----- success state ----- */
    if (submitted) {
        return (
            <main className="mx-auto max-w-[760px] px-6 py-16 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-teal-surface">
                    <Check className="h-6 w-6 text-teal-ink" />
                </div>
                <h1 className="mb-2 text-2xl font-semibold text-navy">Proposal submitted</h1>
                <p className="mb-6 text-[15px] text-zinc-600">
                    Thank you — your suggestions were sent as a review request. An editor will compare your version
                    with the current one.
                </p>
                {submittedUrl && (
                    <a
                        href={submittedUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm font-semibold text-teal hover:text-navy hover:underline"
                    >
                        View your proposal on GitHub →
                    </a>
                )}
            </main>
        );
    }

    return (
        <>
            <main className="mx-auto max-w-[760px] px-6 pb-36 pt-7">
                {/* Back link */}
                <a
                    href={topicUrl || '#'}
                    className="mb-[18px] inline-flex items-center gap-1.5 text-[13px] font-semibold text-zinc-500 hover:text-navy"
                >
                    <ArrowLeft className="h-[15px] w-[15px]" />
                    Back to “{doc.title}”
                </a>

                <h1 className="mb-2 text-[28px] font-semibold tracking-[-0.01em] text-zinc-900">Suggest changes</h1>

                <p className="mb-5 text-[15px] leading-relaxed text-zinc-600">
                    You're proposing edits to <b className="text-zinc-900">{doc.title}</b> in{' '}
                    <span className="text-zinc-700">{category}</span>. No account is needed to draft — you'll sign in
                    at the end so editors know who suggested the change.
                </p>

                {/* Info callout */}
                <div
                    className="mb-7 flex gap-2.5 rounded-[10px] border px-4 py-3.5"
                    style={{background: '#eef6f4', borderColor: '#cfe6e0'}}
                >
                    <Info className="mt-0.5 h-[17px] w-[17px] flex-shrink-0" style={{color: '#0c574b'}} />
                    <p className="text-[13px] leading-relaxed" style={{color: '#0c574b'}}>
                        Each suggestion below becomes part of a single proposal. When you submit, we open a review
                        request on GitHub — an editor compares your version with the current one and can accept,
                        discuss, or decline it.
                    </p>
                </div>

                <div className="mb-3.5">
                    <span className={cn(EYEBROW, 'text-zinc-500')}>Your suggestions ({changes.length})</span>
                </div>

                {/* Cards */}
                <div className="mb-4 flex flex-col gap-3.5">
                    {changes.map((c) => (
                        <div key={c.id} className="overflow-hidden rounded-xl border border-border bg-white">
                            {/* header */}
                            <div className="flex items-center gap-2.5 border-b border-zinc-100 px-[18px] py-3.5">
                                <span className="flex h-[26px] w-[26px] flex-shrink-0 items-center justify-center rounded-[7px] bg-teal-surface text-teal-ink">
                                    <Pencil className="h-3.5 w-3.5" />
                                </span>
                                <select
                                    value={c.field}
                                    onChange={(e) => changeField(c, e.target.value)}
                                    className="flex-1 cursor-pointer rounded-[7px] border border-input bg-white px-2.5 py-2 text-[13.5px] font-semibold text-zinc-900 outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                                >
                                    {groups.map((g) => (
                                        <optgroup key={g.group} label={g.group}>
                                            {g.items.map((o) => (
                                                <option key={o.value} value={o.value}>
                                                    {o.label}
                                                </option>
                                            ))}
                                        </optgroup>
                                    ))}
                                </select>
                                <button
                                    type="button"
                                    onClick={() => removeChange(c.id)}
                                    title="Remove suggestion"
                                    disabled={changes.length === 1}
                                    className="cursor-pointer appearance-none rounded-md border-0 bg-transparent p-1.5 text-zinc-400 hover:text-zinc-600 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>

                            {/* body */}
                            <div className="px-[18px] py-4">
                                <div className={cn(EYEBROW, 'mb-1.5 text-zinc-400')}>Current</div>
                                <div className="mb-4 whitespace-pre-wrap rounded-lg border px-3.5 py-3 text-[13.5px] leading-relaxed text-zinc-500"
                                    style={{background: '#fafafa', borderColor: '#f0f0f1'}}
                                >
                                    {currentText(doc, c.field) || <span className="italic text-zinc-400">No current content.</span>}
                                </div>

                                <div className={cn(EYEBROW, 'mb-1.5 text-teal-ink')}>Your suggestion</div>
                                <textarea
                                    value={c.proposed}
                                    onChange={(e) => update(c.id, {proposed: e.target.value, touched: true})}
                                    placeholder="Write your proposed version…"
                                    className="mb-3.5 min-h-[88px] w-full resize-y rounded-lg border border-input bg-white px-3.5 py-3 text-[13.5px] leading-relaxed text-zinc-900 outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                                />

                                <div className={cn(EYEBROW, 'mb-1.5 text-zinc-400')}>
                                    Why?{' '}
                                    <span className="font-medium normal-case tracking-normal">
                                        (optional — helps reviewers)
                                    </span>
                                </div>
                                <input
                                    value={c.reason}
                                    onChange={(e) => update(c.id, {reason: e.target.value})}
                                    placeholder="e.g. The current wording is ambiguous for beginners"
                                    className="w-full rounded-lg border border-input bg-white px-3.5 py-2.5 text-[13.5px] text-zinc-900 outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                                />
                            </div>
                        </div>
                    ))}
                </div>

                {/* Add another */}
                <button
                    type="button"
                    onClick={addChange}
                    className="flex w-full cursor-pointer appearance-none items-center justify-center gap-2 rounded-[10px] border border-dashed bg-white py-3.5 text-[13.5px] font-semibold text-navy hover:bg-zinc-50"
                    style={{borderColor: '#cbd2d0'}}
                >
                    <Plus className="h-4 w-4" strokeWidth={2.5} />
                    Add another suggestion
                </button>
            </main>

            {/* Sticky bottom bar */}
            <div className="fixed inset-x-0 bottom-0 border-t border-border bg-white shadow-[0_-4px_16px_rgba(0,0,0,0.05)]">
                <div className="mx-auto flex max-w-[760px] items-center justify-between gap-4 px-6 py-4">
                    <span className="text-[13px] text-zinc-500">
                        {canSubmit
                            ? `${filledCount} suggestion${filledCount === 1 ? '' : 's'} ready`
                            : 'Write at least one suggestion'}
                    </span>
                    <button
                        type="button"
                        onClick={openSignIn}
                        disabled={!canSubmit}
                        className={cn(
                            'inline-flex cursor-pointer appearance-none items-center gap-2 rounded-[9px] border-0 px-[22px] py-3 text-[14px] font-semibold transition-colors',
                            canSubmit
                                ? 'bg-navy text-white hover:bg-navy/90'
                                : 'cursor-not-allowed bg-zinc-200 text-zinc-400',
                        )}
                    >
                        Continue to submit
                        <ArrowRight className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {/* Submit sheet */}
            <Sheet open={signInOpen} onOpenChange={setSignInOpen}>
                <SheetContent side="right" showCloseButton className="w-full gap-0 p-0 sm:max-w-[420px]">
                    <div className="flex items-center justify-between border-b border-border px-6 py-5">
                        <div className="text-[17px] font-semibold text-navy">Submit your proposal</div>
                    </div>

                    <div className="flex-1 overflow-auto px-6 py-6">
                        <div className={cn(EYEBROW, 'mb-2.5 text-zinc-500')}>Proposal summary</div>
                        <div className="mb-6 overflow-hidden rounded-[10px] border border-border">
                            <div className="border-b border-zinc-100 bg-zinc-50 px-4 py-3 text-[13px] text-zinc-700">
                                <b className="text-zinc-900">{doc.title}</b> · {category}
                            </div>
                            {changes.map((c) => {
                                const filled = !!c.proposed.trim();
                                return (
                                    <div
                                        key={c.id}
                                        className="flex items-center gap-2.5 border-b border-zinc-100 px-4 py-2.5 last:border-b-0"
                                    >
                                        <span
                                            className={cn(
                                                'h-2 w-2 flex-shrink-0 rounded-full',
                                                filled ? 'bg-teal' : 'bg-zinc-300',
                                            )}
                                        />
                                        <span className="flex-1 truncate text-[13px] font-semibold text-zinc-900">
                                            {optionLabel(c.field)}
                                        </span>
                                        <span
                                            className={cn(
                                                'text-[11px] font-bold uppercase tracking-[0.3px]',
                                                filled ? 'text-teal-ink' : 'text-zinc-400',
                                            )}
                                        >
                                            {filled ? 'edited' : 'empty'}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>

                        <div className={cn(EYEBROW, 'mb-2.5 text-zinc-500')}>Sign in to attribute your work</div>
                        <p className="mb-4 text-[13px] leading-relaxed text-zinc-600">
                            We attach your identity to the proposal so editors can credit and contact you. We never
                            post on your behalf.
                        </p>

                        {submitError && (
                            <div className="mb-3 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-[13px] text-destructive">
                                {submitError}
                            </div>
                        )}

                        <button
                            type="button"
                            onClick={() => handleProvider('github')}
                            disabled={submitting}
                            className="mb-2.5 flex w-full cursor-pointer appearance-none items-center justify-center gap-2.5 rounded-[9px] border-0 py-3.5 text-[14px] font-semibold text-white disabled:opacity-60"
                            style={{background: '#18181b'}}
                        >
                            {submitting ? <Spinner className="size-4 text-white" /> : <GithubGlyph />}
                            Continue with GitHub
                        </button>
                        <button
                            type="button"
                            onClick={() => handleProvider('orcid')}
                            disabled={submitting}
                            className="flex w-full cursor-pointer appearance-none items-center justify-center gap-2.5 rounded-[9px] border border-input bg-white py-3.5 text-[14px] font-semibold text-zinc-900 hover:bg-zinc-50 disabled:opacity-60"
                        >
                            <OrcidGlyph />
                            Continue with ORCID
                        </button>

                        <p className="mt-4 text-center text-[12px] leading-relaxed text-zinc-400">
                            By submitting you agree your suggestion may be published under the handbook's license.
                        </p>
                    </div>
                </SheetContent>
            </Sheet>
        </>
    );
};

export default SuggestChangesForm;
