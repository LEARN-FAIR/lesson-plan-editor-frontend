import React, {useEffect, useState} from 'react';
import {
    BookOpen,
    Calendar,
    Check,
    ClipboardCheck,
    FileText,
    Info,
    type LucideIcon,
    Pencil,
    Target,
    Users,
    X,
} from 'lucide-react';
import {useQueryClient} from '@tanstack/react-query';
import type {Activity, FairMarkdownDocument, LearningVerbLevel} from '../../types';
import type {Contributor} from '../../services/contributorService';
import customContributorService from '../../services/customContributorService';
import {getActivityLearningOutcomes} from '../../utils/activityUtils';
import MdxEditorComponent from '../common/MdxEditorComponent';
import {Button} from '../ui/button';
import {Badge} from '../ui/badge';
import {Input} from '../ui/input';
import {Textarea} from '../ui/textarea';
import {Card} from '../ui/card';
import {Avatar, AvatarFallback} from '../ui/avatar';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '../ui/select';
import {useConfirm} from '../ui/confirm-dialog';
import {arrayMove} from '@dnd-kit/sortable';
import {DragHandle, type DragHandleProps, SortableList} from './SortableList';
import {cn} from '../../lib/utils';
import {initialsOf, type OpenDrawer, resolveAuthor, type SectionKey} from './editorTypes';

/** Shorten a label for use inside a confirmation prompt. */
const truncate = (text: string, max = 60): string => {
    const clean = text.trim().replace(/\s+/g, ' ');
    return clean.length > max ? `${clean.slice(0, max).trimEnd()}…` : clean;
};

const FAIR_ELEMENTS: ('F' | 'A' | 'I' | 'R')[] = ['F', 'A', 'I', 'R'];

const STATUS_LABELS: Record<string, string> = {
    draft: 'Draft',
    ready_for_review: 'Ready for review',
    published: 'Published',
};

type Level = 'beginner' | 'intermediate' | 'expert';
const levelVariant = (level: Level) => level;

interface SectionProps {
    document: FairMarkdownDocument;
    onChange: (updated: Partial<FairMarkdownDocument>) => void;
    openDrawer: OpenDrawer;
    contributors: Contributor[];
}

interface EditorSectionsProps extends SectionProps {
    sectionRefs: Record<SectionKey, React.RefObject<HTMLDivElement | null>>;
}

/* ------------------------------------------------------------------ */
/* Shared building blocks                                              */
/* ------------------------------------------------------------------ */

const FieldLabel: React.FC<{children: React.ReactNode; className?: string}> = ({children, className}) => (
    <div className={cn('mb-1.5 text-sm font-medium text-muted-foreground', className)}>{children}</div>
);

const SectionCard: React.FC<{
    id: string;
    num: number;
    title: string;
    icon: LucideIcon;
    refEl: React.RefObject<HTMLDivElement | null>;
    children: React.ReactNode;
    action?: React.ReactNode;
}> = ({id, title, icon: Icon, refEl, children, action}) => (
    <div ref={refEl} id={id} className="mb-9 scroll-mt-3">
        <div className="mb-[18px] flex min-h-9 items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-[19px] font-semibold text-navy">
                <Icon className="h-5 w-5" />
                <span>{title}</span>
            </div>
            {action}
        </div>
        <Card className="p-7">{children}</Card>
    </div>
);

const IconButton: React.FC<{
    label: string;
    onClick: () => void;
    variant?: 'edit' | 'delete';
}> = ({label, onClick, variant = 'edit'}) => (
    <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={label}
        onClick={onClick}
        className={cn(
            'h-7 w-7',
            variant === 'delete'
                ? 'text-destructive hover:bg-destructive/10 hover:text-destructive'
                : 'hover:text-navy',
        )}
    >
        {variant === 'delete' ? <X className="h-4 w-4" /> : <Pencil className="h-[15px] w-[15px]" />}
    </Button>
);

const RowActions: React.FC<{onEdit?: () => void; onDelete?: () => void}> = ({onEdit, onDelete}) => (
    <div className="flex items-start gap-0.5">
        {onEdit && <IconButton label="Edit" onClick={onEdit} />}
        {onDelete && <IconButton label="Delete" onClick={onDelete} variant="delete" />}
    </div>
);

const EmptyState: React.FC<{children: React.ReactNode}> = ({children}) => (
    <div className="px-0.5 py-2.5 text-[13.5px] italic text-zinc-400">{children}</div>
);

const SubHeader: React.FC<{title: string; children?: React.ReactNode}> = ({title, children}) => (
    <div className="mb-3.5 flex items-center justify-between">
        <div className="text-[14.5px] font-semibold text-zinc-700">{title}</div>
        {children}
    </div>
);

// Padding for list-row Cards (the Card component supplies the border + radius).
const rowCard = 'px-4 py-3.5';

/* ------------------------------------------------------------------ */
/* 1. General information                                             */
/* ------------------------------------------------------------------ */

const GeneralSection: React.FC<SectionProps> = ({document, onChange}) => {
    const toggleFair = (element: 'F' | 'A' | 'I' | 'R') => {
        const current = document.fair_elements || [];
        const next = current.includes(element)
            ? current.filter((e) => e !== element)
            : [...current, element];
        onChange({fair_elements: next});
    };

    const statusValue = document.status && STATUS_LABELS[document.status] ? document.status : '';

    return (
        <>
            <div className="mb-[22px] grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-[1fr_2fr]">
                <div>
                    <FieldLabel>Number</FieldLabel>
                    <Input
                        value={document.number || ''}
                        onChange={(e) => onChange({number: e.target.value})}
                        placeholder="LP-000"
                        className="font-semibold text-zinc-900"
                    />
                </div>
                <div>
                    <FieldLabel>Title</FieldLabel>
                    <Input
                        value={document.title || ''}
                        onChange={(e) => onChange({title: e.target.value})}
                        placeholder="Lesson plan title"
                        className="font-semibold text-zinc-900"
                    />
                </div>
                <div>
                    <FieldLabel>Status</FieldLabel>
                    <Select value={statusValue} onValueChange={(value) => onChange({status: value})}>
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select status">
                                {(value: string) => (value ? STATUS_LABELS[value] ?? value : 'Select status')}
                            </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                            {Object.entries(STATUS_LABELS).map(([value, label]) => (
                                <SelectItem key={value} value={value}>
                                    {label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div>
                    <FieldLabel className="mb-1.5">FAIR elements</FieldLabel>
                    <div className="flex gap-2">
                        {FAIR_ELEMENTS.map((letter) => {
                            const active = document.fair_elements?.includes(letter);
                            return (
                                <button
                                    key={letter}
                                    type="button"
                                    aria-pressed={active}
                                    aria-label={`Toggle FAIR element ${letter}`}
                                    onClick={() => toggleFair(letter)}
                                    className={cn(
                                        'flex h-[30px] w-[30px] cursor-pointer appearance-none items-center justify-center rounded-md border-0 text-[13px] font-bold transition-colors',
                                        active ? 'bg-navy text-white' : 'bg-zinc-100 text-zinc-400 hover:bg-zinc-200',
                                    )}
                                >
                                    {letter}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            <FieldLabel className="mb-1.5">Summary</FieldLabel>
            <Textarea
                value={document.description || ''}
                onChange={(e) => onChange({description: e.target.value})}
                placeholder="Enter a summary for this lesson plan…"
                className="min-h-28"
            />
        </>
    );
};

/* ------------------------------------------------------------------ */
/* 2. Authors & reviewers                                             */
/* ------------------------------------------------------------------ */

/** Upsert a custom contributor from name + orcid, returning the id to store. */
const upsertAuthorId = (name: string, orcid: string, existingId?: string): string => {
    const trimmedName = name.trim();
    const parts = trimmedName.split(/\s+/);
    const firstName = parts[0] || trimmedName;
    const lastName = parts.slice(1).join(' ');
    const cleanOrcid = orcid.trim();
    const id = cleanOrcid || existingId || customContributorService.generateId(firstName, lastName);
    customContributorService.addCustomContributor({
        id,
        orcid: cleanOrcid || undefined,
        firstName,
        lastName,
    });
    return id;
};

const AuthorRow: React.FC<{
    id: string;
    contributors: Contributor[];
    onSave: (name: string, orcid: string) => void;
    onDelete: () => void;
    dragHandle?: React.ReactNode;
}> = ({id, contributors, onSave, onDelete, dragHandle}) => {
    const resolved = resolveAuthor(id, contributors);
    const [editing, setEditing] = useState(false);
    const [name, setName] = useState(resolved.name);
    const [orcid, setOrcid] = useState(resolved.orcid);

    useEffect(() => {
        if (!editing) {
            setName(resolved.name);
            setOrcid(resolved.orcid);
        }
    }, [resolved.name, resolved.orcid, editing]);

    if (editing) {
        return (
            <Card className={rowCard}>
                <div className="flex flex-wrap items-center gap-2.5">
                    <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Full name"
                        className="h-8 min-w-[160px] flex-1 text-[13.5px]"
                    />
                    <Input
                        value={orcid}
                        onChange={(e) => setOrcid(e.target.value)}
                        placeholder="ORCID"
                        className="h-8 w-[190px] text-[13.5px]"
                    />
                    <Button
                        size="sm"
                        onClick={() => {
                            if (!name.trim()) return;
                            onSave(name, orcid);
                            setEditing(false);
                        }}
                    >
                        Save
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => setEditing(false)}>
                        Cancel
                    </Button>
                </div>
            </Card>
        );
    }

    return (
        <Card className={rowCard}>
            <div className="flex items-center gap-2.5">
                {dragHandle}
                <Avatar className="h-[34px] w-[34px]">
                    <AvatarFallback className="bg-teal-surface text-[13px] font-bold text-teal-ink">
                        {initialsOf(resolved.name)}
                    </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                    <div className="text-[14.5px] font-semibold text-zinc-900">{resolved.name}</div>
                    <div className="text-[12.5px] text-muted-foreground">{resolved.orcidLabel}</div>
                </div>
                <RowActions onEdit={() => setEditing(true)} onDelete={onDelete} />
            </div>
        </Card>
    );
};

const AuthorsSection: React.FC<SectionProps> = ({document, onChange, openDrawer, contributors}) => {
    const queryClient = useQueryClient();
    const confirm = useConfirm();

    const saveInline = (list: 'authors' | 'reviewers', index: number) => (name: string, orcid: string) => {
        const current = [...(document[list] || [])];
        const newId = upsertAuthorId(name, orcid, current[index]);
        current[index] = newId;
        queryClient.invalidateQueries({queryKey: ['contributors']});
        onChange({[list]: current});
    };

    const remove = (list: 'authors' | 'reviewers', index: number) => async () => {
        const current = [...(document[list] || [])];
        const label = resolveAuthor(current[index], contributors).name;
        const kind = list === 'reviewers' ? 'reviewer' : 'author';
        const ok = await confirm({
            title: `Delete ${kind}?`,
            description: `Are you sure you want to remove “${truncate(label)}” as ${kind === 'author' ? 'an' : 'a'} ${kind}?`,
        });
        if (!ok) return;
        current.splice(index, 1);
        onChange({[list]: current});
    };

    return (
        <>
            <SubHeader title="Authors">
                <Button size="sm" onClick={() => openDrawer({type: 'author', mode: 'add'})}>
                    + Add author
                </Button>
            </SubHeader>
            <div className="mb-[26px]">
                {(document.authors || []).length === 0 ? (
                    <EmptyState>No authors yet.</EmptyState>
                ) : (
                    <SortableList
                        items={document.authors}
                        getId={(id) => `author-${id}`}
                        onReorder={(from, to) => onChange({authors: arrayMove(document.authors, from, to)})}
                        className="flex flex-col gap-2.5"
                        renderItem={(id, index, handleProps) => (
                            <AuthorRow
                                id={id}
                                contributors={contributors}
                                onSave={saveInline('authors', index)}
                                onDelete={remove('authors', index)}
                                dragHandle={<DragHandle {...(handleProps as DragHandleProps)} />}
                            />
                        )}
                    />
                )}
            </div>

            <SubHeader title="Reviewers">
                <Button size="sm" variant="secondary" onClick={() => openDrawer({type: 'reviewer', mode: 'add'})}>
                    + Add reviewer
                </Button>
            </SubHeader>
            <div>
                {(document.reviewers || []).length === 0 ? (
                    <EmptyState>No reviewers yet.</EmptyState>
                ) : (
                    <SortableList
                        items={document.reviewers}
                        getId={(id) => `reviewer-${id}`}
                        onReorder={(from, to) => onChange({reviewers: arrayMove(document.reviewers, from, to)})}
                        className="flex flex-col gap-2.5"
                        renderItem={(id, index, handleProps) => (
                            <AuthorRow
                                id={id}
                                contributors={contributors}
                                onSave={saveInline('reviewers', index)}
                                onDelete={remove('reviewers', index)}
                                dragHandle={<DragHandle {...(handleProps as DragHandleProps)} />}
                            />
                        )}
                    />
                )}
            </div>
        </>
    );
};

/* ------------------------------------------------------------------ */
/* 3. Learning outcomes                                              */
/* ------------------------------------------------------------------ */

const OutcomesSection: React.FC<SectionProps> = ({document, onChange, openDrawer}) => {
    const confirm = useConfirm();
    const outcomes = document.learning_outcomes || {};
    const keys = Object.keys(outcomes).sort((a, b) => parseInt(a, 10) - parseInt(b, 10));

    const remove = async (key: string) => {
        const label = outcomes[key]?.outcome;
        const ok = await confirm({
            title: 'Delete learning outcome?',
            description: label
                ? `Are you sure you want to delete “${truncate(label)}”?`
                : `Are you sure you want to delete learning outcome ${key}?`,
        });
        if (!ok) return;
        const {[key]: _removed, ...rest} = outcomes;
        onChange({learning_outcomes: rest});
    };

    return (
        <>
            <div className="flex flex-col gap-3">
                {keys.length === 0 ? (
                    <EmptyState>No learning outcomes yet.</EmptyState>
                ) : (
                    keys.map((key) => {
                        const outcome = outcomes[key];
                        return (
                            <Card key={key} className="px-[18px] py-4">
                                <div className="flex gap-3">
                                    <div className="flex h-[26px] w-[26px] flex-shrink-0 items-center justify-center rounded-md bg-navy text-[12.5px] font-bold text-white">
                                        {key}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="mb-2.5 text-[14.5px] text-zinc-900">{outcome?.outcome || ''}</div>
                                        <div className="flex flex-wrap gap-2">
                                            {(outcome?.verbs || []).map((v: LearningVerbLevel, i: number) => (
                                                <Badge key={i} variant={levelVariant(v.level)}>
                                                    {v.verb || v.level}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                    <RowActions
                                        onEdit={() => openDrawer({type: 'outcome', mode: 'edit', outcomeKey: key})}
                                        onDelete={() => remove(key)}
                                    />
                                </div>
                            </Card>
                        );
                    })
                )}
            </div>
        </>
    );
};

/* ------------------------------------------------------------------ */
/* 4. Activities                                                     */
/* ------------------------------------------------------------------ */

const ACTIVITY_GROUPS: {section: 'before' | 'during' | 'after'; title: string}[] = [
    {section: 'before', title: 'Before the lesson'},
    {section: 'during', title: 'During the lesson'},
    {section: 'after', title: 'After the lesson'},
];

const activityText = (a: Activity): string =>
    Array.isArray(a.activities) ? a.activities.join('\n') : a.activities || '';

const ActivitiesSection: React.FC<SectionProps> = ({document, onChange, openDrawer}) => {
    const confirm = useConfirm();
    const removeActivity = async (section: 'before' | 'during' | 'after', index: number) => {
        const label = activityText(document.activities?.[section]?.[index] || ({} as Activity));
        const ok = await confirm({
            title: 'Delete activity?',
            description: label
                ? `Are you sure you want to delete “${truncate(label)}”?`
                : 'Are you sure you want to delete this activity?',
        });
        if (!ok) return;
        const list = [...(document.activities?.[section] || [])];
        list.splice(index, 1);
        onChange({activities: {...document.activities, [section]: list}});
    };

    return (
        <>
            {ACTIVITY_GROUPS.map(({section, title}) => {
                const items = document.activities?.[section] || [];
                return (
                    <div key={section} className="mb-[22px] last:mb-0">
                        <SubHeader title={title}>
                            <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => openDrawer({type: 'activity', mode: 'add', section})}
                            >
                                + Add activity
                            </Button>
                        </SubHeader>
                        {items.length === 0 ? (
                            <EmptyState>No activities yet.</EmptyState>
                        ) : (
                            <SortableList
                                items={items}
                                getId={(activity) => `${section}-${activityText(activity)}-${activity.time}-${activity.type}`}
                                onReorder={(from, to) =>
                                    onChange({
                                        activities: {...document.activities, [section]: arrayMove(items, from, to)},
                                    })
                                }
                                className="flex flex-col gap-2.5"
                                renderItem={(activity, index, handleProps) => {
                                    const los = getActivityLearningOutcomes(activity);
                                    return (
                                        <Card className={cn(rowCard, 'flex flex-row items-start gap-2.5')}>
                                            <DragHandle {...(handleProps as DragHandleProps)} />
                                            <div className="mt-0.5 flex h-6 min-w-[24px] flex-shrink-0 items-center justify-center rounded-md bg-teal-surface px-1 text-[11.5px] font-bold text-teal-ink">
                                                {los.join(', ') || '–'}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="mb-2 whitespace-pre-wrap text-sm text-zinc-900">
                                                    {activityText(activity)}
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    {activity.time && <Badge variant="meta">{activity.time}</Badge>}
                                                    {activity.type && <Badge variant="meta">{activity.type}</Badge>}
                                                    {activity.level && (
                                                        <Badge variant={levelVariant(activity.level)} className="capitalize">
                                                            {activity.level}
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                            <RowActions
                                                onEdit={() => openDrawer({type: 'activity', mode: 'edit', section, index})}
                                                onDelete={() => removeActivity(section, index)}
                                            />
                                        </Card>
                                    );
                                }}
                            />
                        )}
                    </div>
                );
            })}
        </>
    );
};

/* ------------------------------------------------------------------ */
/* 5. Prerequisites                                                  */
/* ------------------------------------------------------------------ */

const PrerequisitesSection: React.FC<SectionProps> = ({document, onChange, openDrawer}) => {
    const confirm = useConfirm();
    const items = document.prerequisites || [];
    const remove = async (index: number) => {
        const ok = await confirm({
            title: 'Delete prerequisite?',
            description: `Are you sure you want to delete “${truncate(items[index])}”?`,
        });
        if (!ok) return;
        const list = [...items];
        list.splice(index, 1);
        onChange({prerequisites: list});
    };

    return (
        <>
            {items.length === 0 ? (
                <EmptyState>No prerequisites yet.</EmptyState>
            ) : (
                <SortableList
                    items={items}
                    getId={(item) => `prerequisite-${item}`}
                    onReorder={(from, to) => onChange({prerequisites: arrayMove(items, from, to)})}
                    className="flex flex-col gap-2.5"
                    renderItem={(prerequisite, index, handleProps) => (
                        <Card className={cn(rowCard, 'flex flex-row items-center gap-2.5 py-3')}>
                            <DragHandle {...(handleProps as DragHandleProps)} />
                            <Check className="h-[18px] w-[18px] flex-shrink-0 text-teal" />
                            <div className="flex-1 text-sm text-zinc-900">{prerequisite}</div>
                            <RowActions
                                onEdit={() => openDrawer({type: 'prerequisite', mode: 'edit', index})}
                                onDelete={() => remove(index)}
                            />
                        </Card>
                    )}
                />
            )}
        </>
    );
};

/* ------------------------------------------------------------------ */
/* 6. Additional resources                                           */
/* ------------------------------------------------------------------ */

const resourceMeta = (r: {author?: string; url?: string; doi?: string}): string =>
    [r.author, r.doi ? `DOI: ${r.doi}` : r.url].filter(Boolean).join(' · ');

const ResourcesSection: React.FC<SectionProps> = ({document, onChange, openDrawer}) => {
    const confirm = useConfirm();
    const items = document.additionalResources || [];
    const remove = async (index: number) => {
        const ok = await confirm({
            title: 'Delete resource?',
            description: `Are you sure you want to delete “${truncate(items[index].title)}”?`,
        });
        if (!ok) return;
        const list = [...items];
        list.splice(index, 1);
        onChange({additionalResources: list});
    };

    return (
        <>
            {items.length === 0 ? (
                <EmptyState>No resources yet.</EmptyState>
            ) : (
                <SortableList
                    items={items}
                    getId={(item) => `resource-${item.title}-${item.url ?? item.doi ?? ''}`}
                    onReorder={(from, to) => onChange({additionalResources: arrayMove(items, from, to)})}
                    className="flex flex-col gap-2.5"
                    renderItem={(resource, index, handleProps) => (
                        <Card className={cn(rowCard, 'flex flex-row items-center gap-2.5')}>
                            <DragHandle {...(handleProps as DragHandleProps)} />
                            <div className="min-w-0 flex-1">
                                <div className="text-[14.5px] font-semibold text-zinc-900">{resource.title}</div>
                                {resourceMeta(resource) && (
                                    <div className="mt-0.5 break-words text-[12.5px] text-muted-foreground">
                                        {resourceMeta(resource)}
                                    </div>
                                )}
                            </div>
                            <RowActions
                                onEdit={() => openDrawer({type: 'resource', mode: 'edit', index})}
                                onDelete={() => remove(index)}
                            />
                        </Card>
                    )}
                />
            )}
        </>
    );
};

/* ------------------------------------------------------------------ */
/* 7. Content                                                        */
/* ------------------------------------------------------------------ */

const ContentSection: React.FC<SectionProps> = ({document, onChange}) => (
    // The redesigned card already supplies the numbered heading, so we mount the
    // existing MDX editor directly (per the handoff: "in production this is the
    // existing MDX editor component").
    <div className="min-h-[400px]">
        <MdxEditorComponent
            markdown={document.content || ''}
            onChange={(value) => onChange({content: value})}
            minHeight="400px"
            maxHeight="800px"
            showToolbar={true}
            showDiffToggle={true}
            placeholder="Write your markdown content here…"
        />
    </div>
);

/* ------------------------------------------------------------------ */
/* Composite                                                          */
/* ------------------------------------------------------------------ */

const EditorSections: React.FC<EditorSectionsProps> = (props) => {
    const {sectionRefs} = props;
    return (
        <>
            <SectionCard id="sec-general" num={1} title="General information" icon={Info} refEl={sectionRefs.general}>
                <GeneralSection {...props} />
            </SectionCard>
            <SectionCard id="sec-authors" num={2} title="Authors & reviewers" icon={Users} refEl={sectionRefs.authors}>
                <AuthorsSection {...props} />
            </SectionCard>
            <SectionCard
                id="sec-outcomes"
                num={3}
                title="Learning outcomes"
                icon={Target}
                refEl={sectionRefs.outcomes}
                action={
                    <Button size="sm" onClick={() => props.openDrawer({type: 'outcome', mode: 'add'})}>
                        + Add outcome
                    </Button>
                }
            >
                <OutcomesSection {...props} />
            </SectionCard>
            <SectionCard id="sec-activities" num={4} title="Activities" icon={Calendar} refEl={sectionRefs.activities}>
                <ActivitiesSection {...props} />
            </SectionCard>
            <SectionCard
                id="sec-prerequisites"
                num={5}
                title="Prerequisites"
                icon={ClipboardCheck}
                refEl={sectionRefs.prerequisites}
                action={
                    <Button size="sm" onClick={() => props.openDrawer({type: 'prerequisite', mode: 'add'})}>
                        + Add prerequisite
                    </Button>
                }
            >
                <PrerequisitesSection {...props} />
            </SectionCard>
            <SectionCard
                id="sec-resources"
                num={6}
                title="Additional resources"
                icon={BookOpen}
                refEl={sectionRefs.resources}
                action={
                    <Button size="sm" onClick={() => props.openDrawer({type: 'resource', mode: 'add'})}>
                        + Add resource
                    </Button>
                }
            >
                <ResourcesSection {...props} />
            </SectionCard>
            <SectionCard id="sec-content" num={7} title="Content" icon={FileText} refEl={sectionRefs.content}>
                <ContentSection {...props} />
            </SectionCard>
        </>
    );
};

export default EditorSections;
