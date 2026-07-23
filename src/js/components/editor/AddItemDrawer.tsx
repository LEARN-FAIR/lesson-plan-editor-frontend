import React, {useMemo, useState} from 'react';
import {useQueryClient} from '@tanstack/react-query';
import type {Activity, FairMarkdownDocument, LearningOutcome, Resource} from '../../types';
import type {Contributor} from '../../services/contributorService';
import customContributorService from '../../services/customContributorService';
import {Check, ChevronDown, Plus, Search} from 'lucide-react';
import {getActivityLearningOutcomes} from '../../utils/activityUtils';
import MdxEditorComponent from '../common/MdxEditorComponent';
import {Sheet, SheetContent, SheetTitle} from '../ui/sheet';
import {Button} from '../ui/button';
import {Input} from '../ui/input';
import {Textarea} from '../ui/textarea';
import {Label} from '../ui/label';
import {Alert} from '../ui/alert';
import {Avatar, AvatarFallback} from '../ui/avatar';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '../ui/select';
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import {cn} from '../../lib/utils';
import {initialsOf, type DrawerRequest} from './editorTypes';

const DRAWER_TITLES: Record<DrawerRequest['type'], string> = {
    author: 'author',
    reviewer: 'reviewer',
    outcome: 'learning outcome',
    activity: 'activity',
    prerequisite: 'prerequisite',
    resource: 'resource',
};

interface AddItemDrawerProps {
    request: DrawerRequest | null;
    document: FairMarkdownDocument;
    onChange: (updated: Partial<FairMarkdownDocument>) => void;
    onClose: () => void;
    contributors: Contributor[];
    /** Scroll-area element the drawer/scrim portals into (so it doesn't cover the header). */
    container: HTMLElement | null;
}

const FieldGroup: React.FC<{label: string; children: React.ReactNode; className?: string}> = ({
    label,
    children,
    className,
}) => (
    <div className={cn('mb-3.5', className)}>
        <Label className="mb-1.5 block">{label}</Label>
        {children}
    </div>
);

// Format free text into the ORCID shape `0000-0000-0000-0000` as the user types.
// Digits go anywhere; an 'X' checksum is only allowed as the 16th character.
const formatOrcid = (raw: string): string => {
    let out = '';
    for (const ch of raw.toUpperCase()) {
        if (out.length >= 16) break;
        if (/[0-9]/.test(ch)) out += ch;
        else if (ch === 'X' && out.length === 15) out += 'X';
    }
    return (out.match(/.{1,4}/g) || []).join('-');
};

const isCompleteOrcid = (v: string): boolean => /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/.test(v);

// Persist a new contributor. The id is the ORCID (required); `git` is optional.
const upsertContributor = (firstName: string, lastName: string, orcid: string, git: string): string => {
    const id = orcid.trim();
    customContributorService.addCustomContributor({
        id,
        orcid: id,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        git: git.trim() || undefined,
    });
    return id;
};

/* ------------------------------------------------------------------ */
/* Per-type form body                                                 */
/* ------------------------------------------------------------------ */

const DrawerBody: React.FC<AddItemDrawerProps & {request: DrawerRequest}> = ({
    request,
    document,
    onChange,
    onClose,
    contributors,
}) => {
    const queryClient = useQueryClient();
    const isAuthorLike = request.type === 'author' || request.type === 'reviewer';
    const listKey: 'authors' | 'reviewers' = request.type === 'reviewer' ? 'reviewers' : 'authors';

    /* ---- author / reviewer state (search-then-add) ---- */
    const [authorQuery, setAuthorQuery] = useState('');
    const [pickedId, setPickedId] = useState<string | null>(null);
    const [addNewForced, setAddNewForced] = useState(false);
    const [newFirstName, setNewFirstName] = useState('');
    const [newLastName, setNewLastName] = useState('');
    const [newOrcid, setNewOrcid] = useState('');
    const [newGit, setNewGit] = useState('');

    /* ---- outcome state ---- */
    const editingOutcome =
        request.type === 'outcome' && request.mode === 'edit' && request.outcomeKey
            ? document.learning_outcomes[request.outcomeKey]
            : undefined;
    const [outcomeText, setOutcomeText] = useState(editingOutcome?.outcome || '');
    const initialVerbs = () => {
        const v = {beginner: '', intermediate: '', expert: ''};
        editingOutcome?.verbs?.forEach((verb) => {
            v[verb.level] = verb.verb || '';
        });
        return v;
    };
    const [verbs, setVerbs] = useState(initialVerbs);

    /* ---- activity state ---- */
    const editingActivity =
        request.type === 'activity' && request.mode === 'edit' && request.section !== undefined && request.index !== undefined
            ? document.activities?.[request.section]?.[request.index]
            : undefined;
    const [activityLos, setActivityLos] = useState<string[]>(
        editingActivity ? getActivityLearningOutcomes(editingActivity).map(String) : [],
    );
    const [activityText, setActivityText] = useState(
        editingActivity
            ? Array.isArray(editingActivity.activities)
                ? editingActivity.activities.join('\n')
                : editingActivity.activities
            : '',
    );
    const [activityTime, setActivityTime] = useState(editingActivity?.time || '');
    const [activityType, setActivityType] = useState(editingActivity?.type || '');
    const [activityLevel, setActivityLevel] = useState<'beginner' | 'intermediate' | 'expert'>(
        editingActivity?.level || 'beginner',
    );

    /* ---- prerequisite state ---- */
    const editingPrereq =
        request.type === 'prerequisite' && request.mode === 'edit' && request.index !== undefined
            ? document.prerequisites?.[request.index]
            : undefined;
    const [prereq, setPrereq] = useState(editingPrereq || '');

    /* ---- resource state ---- */
    const editingResource =
        request.type === 'resource' && request.mode === 'edit' && request.index !== undefined
            ? document.additionalResources?.[request.index]
            : undefined;
    const [resTitle, setResTitle] = useState(editingResource?.title || '');
    const [resAuthor, setResAuthor] = useState(editingResource?.author || '');
    const [resUrl, setResUrl] = useState(editingResource?.url || '');
    const [resDoi, setResDoi] = useState(editingResource?.doi || '');
    const [resInfo, setResInfo] = useState(editingResource?.additionalInformation || '');

    const outcomeKeys = useMemo(
        () => Object.keys(document.learning_outcomes || {}).sort((a, b) => parseInt(a, 10) - parseInt(b, 10)),
        [document.learning_outcomes],
    );

    const toggleLo = (key: string) =>
        setActivityLos((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));

    /* ---- author / reviewer derived state ---- */
    const contributorName = (c: Contributor) => `${c.firstName} ${c.lastName}`.trim();
    const contributorOrcid = (c: Contributor) => c.orcid || (c.id.startsWith('0000-') ? c.id : '');
    // Contributors already in this list can't be added again.
    const alreadyAdded = useMemo(() => new Set(document[listKey] || []), [document, listKey]);
    const selectableContributors = useMemo(
        () =>
            contributors
                .filter((c) => !alreadyAdded.has(c.id))
                // Sort by last name, then first name.
                .sort(
                    (a, b) =>
                        (a.lastName || '').localeCompare(b.lastName || '') ||
                        (a.firstName || '').localeCompare(b.firstName || ''),
                ),
        [contributors, alreadyAdded],
    );
    const filteredContributors = useMemo(() => {
        const q = authorQuery.trim().toLowerCase();
        if (!q) return selectableContributors;
        return selectableContributors.filter(
            (c) => contributorName(c).toLowerCase().includes(q) || contributorOrcid(c).toLowerCase().includes(q),
        );
    }, [authorQuery, selectableContributors]);
    const noMatches = authorQuery.trim().length > 0 && filteredContributors.length === 0;
    const hasSelectable = selectableContributors.length > 0;
    // Reveal the add-new form when forced or when there is nothing selectable to pick.
    const showAddNew = addNewForced || filteredContributors.length === 0;

    /* ---- validation ---- */
    const canSave = (() => {
        switch (request.type) {
            case 'author':
            case 'reviewer':
                return (
                    pickedId !== null ||
                    (showAddNew &&
                        newFirstName.trim().length > 0 &&
                        newLastName.trim().length > 0 &&
                        isCompleteOrcid(newOrcid))
                );
            case 'outcome':
                return outcomeText.trim().length > 0;
            case 'activity':
                return activityLos.length > 0 && activityText.trim().length > 0 && activityTime.trim().length > 0 && activityType.trim().length > 0;
            case 'prerequisite':
                return prereq.trim().length > 0;
            case 'resource':
                return resTitle.trim().length > 0 && (resUrl.trim().length > 0 || resDoi.trim().length > 0);
            default:
                return false;
        }
    })();

    const handleSave = () => {
        if (!canSave) return;

        if (isAuthorLike) {
            let id: string;
            if (pickedId) {
                id = pickedId;
            } else {
                if (!newFirstName.trim() || !newLastName.trim() || !newOrcid.trim()) return;
                id = upsertContributor(newFirstName, newLastName, newOrcid, newGit);
                queryClient.invalidateQueries({queryKey: ['contributors']});
            }
            const current = [...(document[listKey] || [])];
            current.push(id);
            onChange({[listKey]: current});
        } else if (request.type === 'outcome') {
            const builtVerbs = (['beginner', 'intermediate', 'expert'] as const)
                .filter((level) => verbs[level].trim())
                .map((level) => ({verb: verbs[level].trim(), level}));
            const outcome: LearningOutcome = {outcome: outcomeText.trim(), verbs: builtVerbs};
            const outcomes = {...(document.learning_outcomes || {})};
            if (request.mode === 'edit' && request.outcomeKey) {
                outcomes[request.outcomeKey] = outcome;
            } else {
                const numericIds = Object.keys(outcomes).map((k) => parseInt(k, 10)).filter((n) => !Number.isNaN(n));
                const nextId = numericIds.length ? Math.max(...numericIds) + 1 : 1;
                outcomes[String(nextId)] = outcome;
            }
            onChange({learning_outcomes: outcomes});
        } else if (request.type === 'activity' && request.section) {
            const activity: Activity = {
                learning_outcomes: activityLos.map((k) => parseInt(k, 10)).filter((n) => !Number.isNaN(n)),
                activities: activityText.trim(),
                time: activityTime.trim(),
                type: activityType.trim(),
                level: activityLevel,
            };
            const list = [...(document.activities?.[request.section] || [])];
            if (request.mode === 'edit' && request.index !== undefined) {
                list[request.index] = activity;
            } else {
                list.push(activity);
            }
            onChange({activities: {...document.activities, [request.section]: list}});
        } else if (request.type === 'prerequisite') {
            const list = [...(document.prerequisites || [])];
            if (request.mode === 'edit' && request.index !== undefined) {
                list[request.index] = prereq.trim();
            } else {
                list.push(prereq.trim());
            }
            onChange({prerequisites: list});
        } else if (request.type === 'resource') {
            const resource: Resource = {
                title: resTitle.trim(),
                ...(resAuthor.trim() && {author: resAuthor.trim()}),
                ...(resUrl.trim() && {url: resUrl.trim()}),
                ...(resDoi.trim() && {doi: resDoi.trim()}),
                ...(resInfo.trim() && {additionalInformation: resInfo.trim()}),
            };
            const list = [...(document.additionalResources || [])];
            if (request.mode === 'edit' && request.index !== undefined) {
                list[request.index] = resource;
            } else {
                list.push(resource);
            }
            onChange({additionalResources: list});
        }

        onClose();
    };

    const titleVerb = request.mode === 'edit' ? 'Edit' : 'Add';

    return (
        <>
            <SheetTitle className="mb-[18px]">
                {titleVerb} {DRAWER_TITLES[request.type]}
            </SheetTitle>

            {isAuthorLike && (
                <>
                    {/* Search existing contributors */}
                    {(hasSelectable || authorQuery.trim().length > 0) && (
                        <FieldGroup label={`Find an existing ${DRAWER_TITLES[request.type]}`}>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    autoFocus
                                    value={authorQuery}
                                    onChange={(e) => {
                                        setAuthorQuery(e.target.value);
                                        setPickedId(null);
                                        setAddNewForced(false);
                                    }}
                                    placeholder="Search by name or ORCID…"
                                    className="pl-9"
                                />
                            </div>
                        </FieldGroup>
                    )}

                    {/* Selectable results */}
                    {!showAddNew && (
                        <div className="mb-3.5 flex max-h-64 flex-col gap-1.5 overflow-y-auto">
                            {filteredContributors.map((c) => {
                                const selected = pickedId === c.id;
                                const cname = contributorName(c);
                                const corcid = contributorOrcid(c);
                                return (
                                    <button
                                        key={c.id}
                                        type="button"
                                        onClick={() => setPickedId(selected ? null : c.id)}
                                        className={cn(
                                            'flex cursor-pointer appearance-none items-center gap-3 rounded-md border px-3 py-2 text-left transition-colors',
                                            selected
                                                ? 'border-navy bg-teal-surface'
                                                : 'border-border bg-background hover:bg-accent',
                                        )}
                                    >
                                        <Avatar className="h-8 w-8">
                                            <AvatarFallback className="bg-teal-surface text-xs font-bold text-teal-ink">
                                                {initialsOf(cname)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="min-w-0 flex-1">
                                            <div className="text-sm font-medium text-zinc-900">{cname}</div>
                                            <div className="text-xs text-muted-foreground">
                                                {corcid || 'No ORCID on file'}
                                            </div>
                                        </div>
                                        {selected && <Check className="h-4 w-4 flex-shrink-0 text-navy" />}
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {/* Force add-new when results exist but none picked */}
                    {!showAddNew && !pickedId && (
                        <Button
                            variant="link"
                            size="sm"
                            className="mb-2 h-auto px-0"
                            onClick={() => setAddNewForced(true)}
                        >
                            <Plus className="h-4 w-4" />
                            Add someone new instead
                        </Button>
                    )}

                    {/* No-match notice */}
                    {noMatches && (
                        <Alert variant="info" className="mb-3">
                            No {DRAWER_TITLES[request.type]} matches “{authorQuery.trim()}”. Add them below.
                        </Alert>
                    )}

                    {/* Add a new contributor */}
                    {showAddNew && (
                        <>
                            <div className="mb-3.5 flex gap-2.5">
                                <div className="flex-1">
                                    <Label className="mb-1.5 block">First name</Label>
                                    <Input
                                        autoFocus={!hasSelectable}
                                        value={newFirstName}
                                        onChange={(e) => setNewFirstName(e.target.value)}
                                        placeholder="First name"
                                    />
                                </div>
                                <div className="flex-1">
                                    <Label className="mb-1.5 block">Last name</Label>
                                    <Input
                                        value={newLastName}
                                        onChange={(e) => setNewLastName(e.target.value)}
                                        placeholder="Last name"
                                    />
                                </div>
                            </div>
                            <FieldGroup label="ORCID">
                                <Input
                                    value={newOrcid}
                                    onChange={(e) => setNewOrcid(formatOrcid(e.target.value))}
                                    placeholder="0000-0000-0000-0000"
                                    inputMode="numeric"
                                    maxLength={19}
                                />
                                {newOrcid.length > 0 && !isCompleteOrcid(newOrcid) && (
                                    <div className="mt-1 text-xs text-destructive">
                                        Enter a full ORCID: 0000-0000-0000-0000
                                    </div>
                                )}
                            </FieldGroup>
                            <FieldGroup label="GitHub username (optional)">
                                <Input
                                    value={newGit}
                                    onChange={(e) => setNewGit(e.target.value)}
                                    placeholder="github-handle"
                                />
                            </FieldGroup>
                            {addNewForced && hasSelectable && (
                                <Button
                                    variant="link"
                                    size="sm"
                                    className="mb-2 h-auto px-0"
                                    onClick={() => {
                                        setAddNewForced(false);
                                        setNewFirstName('');
                                        setNewLastName('');
                                        setNewOrcid('');
                                        setNewGit('');
                                    }}
                                >
                                    Back to search
                                </Button>
                            )}
                        </>
                    )}
                </>
            )}

            {request.type === 'outcome' && (
                <>
                    <FieldGroup label="Outcome">
                        <Textarea
                            value={outcomeText}
                            onChange={(e) => setOutcomeText(e.target.value)}
                            placeholder="Learners will be able to…"
                            className="h-[76px]"
                        />
                    </FieldGroup>
                    <div className="mb-2 flex flex-col gap-2">
                        <Input value={verbs.beginner} onChange={(e) => setVerbs({...verbs, beginner: e.target.value})} placeholder="Beginner verb" className="text-[13.5px]" />
                        <Input value={verbs.intermediate} onChange={(e) => setVerbs({...verbs, intermediate: e.target.value})} placeholder="Intermediate verb" className="text-[13.5px]" />
                        <Input value={verbs.expert} onChange={(e) => setVerbs({...verbs, expert: e.target.value})} placeholder="Expert verb" className="text-[13.5px]" />
                    </div>
                </>
            )}

            {request.type === 'activity' && (
                <>
                    <FieldGroup label="Linked learning outcomes">
                        {outcomeKeys.length === 0 ? (
                            <div className="text-[13px] italic text-zinc-400">Add a learning outcome first.</div>
                        ) : (
                            <>
                                <DropdownMenu>
                                    <DropdownMenuTrigger
                                        render={
                                            <Button
                                                variant="outline"
                                                className="w-full justify-between font-normal"
                                            />
                                        }
                                    >
                                        <span className="truncate text-muted-foreground data-[has-value=true]:text-foreground" data-has-value={activityLos.length > 0}>
                                            {activityLos.length > 0
                                                ? `Outcome${activityLos.length > 1 ? 's' : ''} ${activityLos.join(', ')}`
                                                : 'Select learning outcomes'}
                                        </span>
                                        <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="start" className="max-h-72 w-[var(--anchor-width)] min-w-72 overflow-y-auto">
                                        {outcomeKeys.map((key) => (
                                            <DropdownMenuCheckboxItem
                                                key={key}
                                                checked={activityLos.includes(key)}
                                                onCheckedChange={() => toggleLo(key)}
                                                closeOnClick={false}
                                                className="items-start whitespace-normal text-sm"
                                            >
                                                <span className="mr-1 font-semibold text-navy">{key}.</span>
                                                <span>{document.learning_outcomes[key]?.outcome}</span>
                                            </DropdownMenuCheckboxItem>
                                        ))}
                                    </DropdownMenuContent>
                                </DropdownMenu>

                                {activityLos.length > 0 && (
                                    <div className="mt-2 flex flex-col gap-1">
                                        {activityLos
                                            .slice()
                                            .sort((a, b) => parseInt(a, 10) - parseInt(b, 10))
                                            .map((key) => (
                                                <div key={key} className="flex gap-1.5 text-xs text-muted-foreground">
                                                    <span className="font-semibold text-navy">{key}.</span>
                                                    <span className="line-clamp-1">
                                                        {document.learning_outcomes[key]?.outcome}
                                                    </span>
                                                </div>
                                            ))}
                                    </div>
                                )}
                            </>
                        )}
                    </FieldGroup>
                    <div className="mb-3 flex gap-2.5">
                        <div className="flex-1">
                            <Label className="mb-1.5 block">Time</Label>
                            <Input value={activityTime} onChange={(e) => setActivityTime(e.target.value)} placeholder="e.g. 30 min" />
                        </div>
                        <div className="flex-1">
                            <Label className="mb-1.5 block">Type</Label>
                            <Input value={activityType} onChange={(e) => setActivityType(e.target.value)} placeholder="e.g. workshop" />
                        </div>
                    </div>
                    <FieldGroup label="Level">
                        <Select value={activityLevel} onValueChange={(v) => setActivityLevel(v as typeof activityLevel)}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="beginner">Beginner</SelectItem>
                                <SelectItem value="intermediate">Intermediate</SelectItem>
                                <SelectItem value="expert">Expert</SelectItem>
                            </SelectContent>
                        </Select>
                    </FieldGroup>
                    <FieldGroup label="Description">
                        <div className="overflow-hidden rounded-md border border-input bg-zinc-50">
                            <MdxEditorComponent
                                markdown={activityText}
                                onChange={setActivityText}
                                minHeight="90px"
                                maxHeight="240px"
                                placeholder="Describe the activity…"
                                showToolbar={true}
                                showDiffToggle={false}
                            />
                        </div>
                    </FieldGroup>
                </>
            )}

            {request.type === 'prerequisite' && (
                <FieldGroup label="Prerequisite">
                    <Input
                        value={prereq}
                        onChange={(e) => setPrereq(e.target.value)}
                        placeholder="e.g. Familiarity with spreadsheets"
                    />
                </FieldGroup>
            )}

            {request.type === 'resource' && (
                <>
                    <FieldGroup label="Title">
                        <Input value={resTitle} onChange={(e) => setResTitle(e.target.value)} placeholder="Resource title" />
                    </FieldGroup>
                    <FieldGroup label="Author (optional)">
                        <Input value={resAuthor} onChange={(e) => setResAuthor(e.target.value)} placeholder="Author or publisher" />
                    </FieldGroup>
                    <FieldGroup label="URL">
                        <Input value={resUrl} onChange={(e) => setResUrl(e.target.value)} placeholder="https://…" />
                    </FieldGroup>
                    <FieldGroup label="DOI">
                        <Input value={resDoi} onChange={(e) => setResDoi(e.target.value)} placeholder="10.xxxx/xxxx" />
                    </FieldGroup>
                    <FieldGroup label="Additional information (optional)">
                        <Textarea value={resInfo} onChange={(e) => setResInfo(e.target.value)} placeholder="Notes about this resource…" />
                    </FieldGroup>
                    <div className="mb-1 text-[11.5px] text-zinc-400">Provide a URL or a DOI.</div>
                </>
            )}

            <div className="mt-5 flex gap-2.5">
                <Button className="flex-1" disabled={!canSave} onClick={handleSave}>
                    Save
                </Button>
                <Button variant="secondary" onClick={onClose}>
                    Cancel
                </Button>
            </div>
        </>
    );
};

/* ------------------------------------------------------------------ */
/* Sheet wrapper                                                       */
/* ------------------------------------------------------------------ */

const AddItemDrawer: React.FC<AddItemDrawerProps> = (props) => {
    const {request, onClose} = props;
    return (
        <Sheet open={!!request} onOpenChange={(open) => !open && onClose()}>
            {request && (
                <SheetContent
                    side="right"
                    className="w-full sm:max-w-md"
                    // Remount the form whenever the target changes so local state resets.
                    key={`${request.type}-${request.mode}-${request.section ?? ''}-${request.index ?? ''}-${request.outcomeKey ?? ''}`}
                >
                    <div className="flex h-full flex-col overflow-y-auto p-6">
                        <DrawerBody {...props} request={request} />
                    </div>
                </SheetContent>
            )}
        </Sheet>
    );
};

export default AddItemDrawer;
