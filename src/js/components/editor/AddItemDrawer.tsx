import React, {useMemo, useState} from 'react';
import {useQueryClient} from '@tanstack/react-query';
import type {Activity, FairMarkdownDocument, LearningOutcome, Resource} from '../../types';
import type {Contributor} from '../../services/contributorService';
import customContributorService from '../../services/customContributorService';
import {ChevronDown} from 'lucide-react';
import {getActivityLearningOutcomes} from '../../utils/activityUtils';
import MdxEditorComponent from '../common/MdxEditorComponent';
import {Sheet, SheetContent, SheetTitle} from '../ui/sheet';
import {Button} from '../ui/button';
import {Input} from '../ui/input';
import {Textarea} from '../ui/textarea';
import {Label} from '../ui/label';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '../ui/select';
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import {cn} from '../../lib/utils';
import type {DrawerRequest} from './editorTypes';

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

const upsertAuthorId = (name: string, orcid: string): string => {
    const trimmed = name.trim();
    const parts = trimmed.split(/\s+/);
    const firstName = parts[0] || trimmed;
    const lastName = parts.slice(1).join(' ');
    const cleanOrcid = orcid.trim();
    const id = cleanOrcid || customContributorService.generateId(firstName, lastName);
    customContributorService.addCustomContributor({id, orcid: cleanOrcid || undefined, firstName, lastName});
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

    /* ---- author / reviewer state ---- */
    const [selectedId, setSelectedId] = useState('');
    const [name, setName] = useState('');
    const [orcid, setOrcid] = useState('');

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

    const pickContributor = (id: string) => {
        const c = contributors.find((x) => x.id === id);
        setSelectedId(id);
        if (c) {
            setName(`${c.firstName} ${c.lastName}`.trim());
            setOrcid(c.orcid || (c.id.startsWith('0000-') ? c.id : ''));
        }
    };

    /* ---- validation ---- */
    const canSave = (() => {
        switch (request.type) {
            case 'author':
            case 'reviewer':
                return name.trim().length > 0;
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
            const selected = contributors.find((c) => c.id === selectedId);
            const unchanged =
                selected &&
                `${selected.firstName} ${selected.lastName}`.trim() === name.trim() &&
                (selected.orcid || (selected.id.startsWith('0000-') ? selected.id : '')) === orcid.trim();
            const id = unchanged ? selected!.id : upsertAuthorId(name, orcid);
            const current = [...(document[listKey] || [])];
            current.push(id);
            queryClient.invalidateQueries({queryKey: ['contributors']});
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
                    {contributors.length > 0 && (
                        <FieldGroup label="Pick an existing contributor">
                            <Select value={selectedId} onValueChange={pickContributor}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Search the contributor list" />
                                </SelectTrigger>
                                <SelectContent>
                                    {contributors.map((c) => (
                                        <SelectItem key={c.id} value={c.id}>
                                            {c.firstName} {c.lastName}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </FieldGroup>
                    )}
                    <FieldGroup label="Name">
                        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" />
                    </FieldGroup>
                    <FieldGroup label="ORCID (optional)">
                        <Input value={orcid} onChange={(e) => setOrcid(e.target.value)} placeholder="0000-0000-0000-0000" />
                    </FieldGroup>
                </>
            )}

            {request.type === 'outcome' && (
                <>
                    <FieldGroup label="Outcome">
                        <div className="overflow-hidden rounded-md border border-input bg-zinc-50">
                            <MdxEditorComponent
                                markdown={outcomeText}
                                onChange={setOutcomeText}
                                minHeight="90px"
                                maxHeight="240px"
                                placeholder="Learners will be able to…"
                                showToolbar={true}
                                showDiffToggle={false}
                            />
                        </div>
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
                        <Textarea
                            value={activityText}
                            onChange={(e) => setActivityText(e.target.value)}
                            placeholder="Describe the activity…"
                            className="h-[84px]"
                        />
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
