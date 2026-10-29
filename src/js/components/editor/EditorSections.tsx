import React from 'react';
import {
    BookOpen,
    Calendar,
    Check,
    ClipboardCheck,
    FileText,
    Info,
    Library,
    ListChecks,
    type LucideIcon,
    Pencil,
    Target,
    Users,
    X,
} from 'lucide-react';
import type {Activity, DeliveryFormat, FairMarkdownDocument, Level, Reference} from '../../types';
import type {Contributor} from '../../services/contributorService';
import {getActivityLearningOutcomes, remapActivityOutcomes} from '../../utils/activityUtils';
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

const LEVELS: Level[] = ['beginner', 'intermediate', 'expert'];
const levelVariant = (level: Level) => level;

const DELIVERY_LABELS: Record<DeliveryFormat, string> = {
    in_person: 'In person',
    online: 'Online',
    hybrid: 'Hybrid',
    self_paced: 'Self-paced',
};

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

            <div className="mb-[22px] grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
                <div>
                    <FieldLabel>Delivery format</FieldLabel>
                    <Select
                        value={document.delivery_format || ''}
                        onValueChange={(value) => onChange({delivery_format: (value || undefined) as DeliveryFormat | undefined})}
                    >
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder="Not specified">
                                {(value: string) =>
                                    value ? DELIVERY_LABELS[value as DeliveryFormat] ?? value : 'Not specified'
                                }
                            </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                            {Object.entries(DELIVERY_LABELS).map(([value, label]) => (
                                <SelectItem key={value} value={value}>
                                    {label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div>
                    <FieldLabel className="mb-1.5">Levels</FieldLabel>
                    <div className="flex flex-wrap gap-2">
                        {LEVELS.map((level) => {
                            const active = document.levels?.includes(level);
                            return (
                                <button
                                    key={level}
                                    type="button"
                                    aria-pressed={active}
                                    onClick={() => {
                                        const current = document.levels || [];
                                        const next = active ? current.filter((l) => l !== level) : [...current, level];
                                        onChange({levels: next.length ? LEVELS.filter((l) => next.includes(l)) : undefined});
                                    }}
                                    className={cn(
                                        'h-[30px] cursor-pointer appearance-none rounded-md border-0 px-3 text-[13px] font-semibold capitalize transition-colors',
                                        active ? 'bg-navy text-white' : 'bg-zinc-100 text-zinc-400 hover:bg-zinc-200',
                                    )}
                                >
                                    {level}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            <FieldLabel className="mb-1.5">Summary</FieldLabel>
            <Textarea
                value={document.summary ?? document.description ?? ''}
                onChange={(e) => onChange({summary: e.target.value})}
                placeholder="Enter a summary for this lesson plan…"
                className="min-h-28"
            />

            <ManagedInfo document={document} />
        </>
    );
};

/** Read-only values written by the Zenodo deposit script and Jekyll. */
const ManagedInfo: React.FC<{document: FairMarkdownDocument}> = ({document}) => {
    const rows: [string, string | undefined][] = [
        ['DOI', document.doi],
        ['Concept DOI', document.zenodo_concept_doi],
        ['Permalink', document.permalink],
        ['Last updated', document.last_updated],
    ];
    const present = rows.filter(([, value]) => value);
    if (present.length === 0) return null;
    const sandbox = document.doi?.startsWith('10.5072/');

    return (
        <div className="mt-[22px] rounded-md bg-zinc-50 px-4 py-3 text-[12.5px] text-muted-foreground">
            <div className="mb-1.5 font-semibold text-zinc-700">
                Managed automatically (read-only){sandbox ? ' · sandbox DOI, not citable' : ''}
            </div>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-0.5">
                {present.map(([label, value]) => (
                    <React.Fragment key={label}>
                        <dt>{label}</dt>
                        <dd className="break-all text-zinc-700">{value}</dd>
                    </React.Fragment>
                ))}
            </dl>
        </div>
    );
};

/* ------------------------------------------------------------------ */
/* 2. Authors & reviewers                                             */
/* ------------------------------------------------------------------ */

const AuthorRow: React.FC<{
    id: string;
    contributors: Contributor[];
    onDelete: () => void;
    dragHandle?: React.ReactNode;
}> = ({id, contributors, onDelete, dragHandle}) => {
    const resolved = resolveAuthor(id, contributors);
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
                <RowActions onDelete={onDelete} />
            </div>
        </Card>
    );
};

const AuthorsSection: React.FC<SectionProps> = ({document, onChange, openDrawer, contributors}) => {
    const confirm = useConfirm();

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
    const outcomes = document.learning_outcomes || [];

    const remove = async (index: number) => {
        const label = outcomes[index]?.title;
        const ok = await confirm({
            title: 'Delete learning outcome?',
            description: label
                ? `Are you sure you want to delete “${truncate(label)}”? Activities linked to it will be unlinked.`
                : `Are you sure you want to delete learning outcome ${index + 1}?`,
        });
        if (!ok) return;
        const removed = index + 1;
        onChange({
            learning_outcomes: outcomes.filter((_, i) => i !== index),
            activities: remapActivityOutcomes(document.activities, (n) =>
                n === removed ? null : n > removed ? n - 1 : n,
            ),
        });
    };

    // Reordering shifts positions, so activity references follow the moved outcome.
    const reorder = (from: number, to: number) => {
        const positionOf = (n: number) => {
            const old = n - 1;
            if (old === from) return to + 1;
            if (from < to && old > from && old <= to) return old;
            if (from > to && old >= to && old < from) return old + 2;
            return n;
        };
        onChange({
            learning_outcomes: arrayMove(outcomes, from, to),
            activities: remapActivityOutcomes(document.activities, positionOf),
        });
    };

    return (
        <>
            {outcomes.length === 0 ? (
                <EmptyState>No learning outcomes yet.</EmptyState>
            ) : (
                <SortableList
                    items={outcomes}
                    getId={(outcome) => `outcome-${outcome.title}`}
                    onReorder={reorder}
                    className="flex flex-col gap-3"
                    renderItem={(outcome, index, handleProps) => (
                        <Card className="px-[18px] py-4">
                            <div className="flex gap-3">
                                <DragHandle {...(handleProps as DragHandleProps)} />
                                <div className="flex h-[26px] w-[26px] flex-shrink-0 items-center justify-center rounded-md bg-navy text-[12.5px] font-bold text-white">
                                    {index + 1}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="mb-1 text-[14.5px] text-zinc-900">{outcome.title}</div>
                                    {outcome.body && (
                                        <div className="mb-2.5 text-[13px] text-muted-foreground">{outcome.body}</div>
                                    )}
                                    <div className="flex flex-wrap gap-2">
                                        {(outcome.levels || []).map((level) => (
                                            <Badge key={level} variant={levelVariant(level)} className="capitalize">
                                                {level}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                                <RowActions
                                    onEdit={() => openDrawer({type: 'outcome', mode: 'edit', index})}
                                    onDelete={() => remove(index)}
                                />
                            </div>
                        </Card>
                    )}
                />
            )}
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

const activityText = (a: Activity): string => [a.title, a.description].filter(Boolean).join(' — ');

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
                                getId={(activity) => `${section}-${activityText(activity)}-${activity.duration_min ?? ''}-${activity.type}`}
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
                                                {activity.title && (
                                                    <div className="mb-0.5 text-[14.5px] font-semibold text-zinc-900">
                                                        {activity.title}
                                                    </div>
                                                )}
                                                <div className="mb-2 line-clamp-3 whitespace-pre-wrap text-sm text-zinc-900">
                                                    {activity.description}
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    {activity.duration_min != null && (
                                                        <Badge variant="meta">{activity.duration_min} min</Badge>
                                                    )}
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

const referenceMeta = (r: Reference): string =>
    [r.authors, r.type, r.year, r.doi ? `DOI: ${r.doi}` : r.url].filter(Boolean).join(' · ');

/** Numbered, sortable list of references; used for both sources and additional resources. */
const ReferenceList: React.FC<
    SectionProps & {field: 'sources' | 'additionalResources'; type: 'source' | 'resource'; noun: string}
> = ({document, onChange, openDrawer, field, type, noun}) => {
    const confirm = useConfirm();
    const items: Reference[] = document[field] || [];
    const remove = async (index: number) => {
        const ok = await confirm({
            title: `Delete ${noun}?`,
            description: `Are you sure you want to delete “${truncate(items[index].title)}”?`,
        });
        if (!ok) return;
        const list = [...items];
        list.splice(index, 1);
        onChange({[field]: list});
    };

    return (
        <>
            {items.length === 0 ? (
                <EmptyState>No {noun}s yet.</EmptyState>
            ) : (
                <SortableList
                    items={items}
                    getId={(item) => `${type}-${item.title}-${item.url ?? item.doi ?? ''}`}
                    onReorder={(from, to) => onChange({[field]: arrayMove(items, from, to)})}
                    className="flex flex-col gap-2.5"
                    renderItem={(item, index, handleProps) => (
                        <Card className={cn(rowCard, 'flex flex-row items-center gap-2.5')}>
                            <DragHandle {...(handleProps as DragHandleProps)} />
                            <div className="flex h-6 min-w-[24px] flex-shrink-0 items-center justify-center rounded-md bg-teal-surface px-1 text-[11.5px] font-bold text-teal-ink">
                                {index + 1}
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="text-[14.5px] font-semibold text-zinc-900">{item.title}</div>
                                {referenceMeta(item) && (
                                    <div className="mt-0.5 break-words text-[12.5px] text-muted-foreground">
                                        {referenceMeta(item)}
                                    </div>
                                )}
                            </div>
                            <RowActions
                                onEdit={() => openDrawer({type, mode: 'edit', index})}
                                onDelete={() => remove(index)}
                            />
                        </Card>
                    )}
                />
            )}
        </>
    );
};

const SourcesSection: React.FC<SectionProps> = (props) => (
    <ReferenceList {...props} field="sources" type="source" noun="source" />
);

const ResourcesSection: React.FC<SectionProps> = (props) => (
    <ReferenceList {...props} field="additionalResources" type="resource" noun="resource" />
);

/* ------------------------------------------------------------------ */
/* Tasks, materials and take-home message                             */
/* ------------------------------------------------------------------ */

const DeliverySection: React.FC<SectionProps> = ({document, onChange, openDrawer}) => {
    const confirm = useConfirm();
    const tasks = document.tasks || [];
    const materials = document.materials || {};

    const removeTask = async (index: number) => {
        const ok = await confirm({
            title: 'Delete task?',
            description: `Are you sure you want to delete “${truncate(tasks[index].title)}”?`,
        });
        if (!ok) return;
        onChange({tasks: tasks.filter((_, i) => i !== index)});
    };

    const setMaterial = (key: 'participants' | 'trainer', value: string) => {
        const next = {...materials, [key]: value};
        if (!value) delete next[key];
        onChange({materials: Object.keys(next).length ? next : undefined});
    };

    return (
        <>
            <SubHeader title="Summary of tasks and actions">
                <Button size="sm" variant="secondary" onClick={() => openDrawer({type: 'task', mode: 'add'})}>
                    + Add task
                </Button>
            </SubHeader>
            <div className="mb-[26px]">
                {tasks.length === 0 ? (
                    <EmptyState>No tasks yet.</EmptyState>
                ) : (
                    <SortableList
                        items={tasks}
                        getId={(task) => `task-${task.title}`}
                        onReorder={(from, to) => onChange({tasks: arrayMove(tasks, from, to)})}
                        className="flex flex-col gap-2.5"
                        renderItem={(task, index, handleProps) => (
                            <Card className={cn(rowCard, 'flex flex-row items-start gap-2.5')}>
                                <DragHandle {...(handleProps as DragHandleProps)} />
                                <div className="min-w-0 flex-1">
                                    <div className="text-[14.5px] font-semibold text-zinc-900">{task.title}</div>
                                    {task.description && (
                                        <div className="mt-0.5 text-[13px] text-muted-foreground">{task.description}</div>
                                    )}
                                </div>
                                <RowActions
                                    onEdit={() => openDrawer({type: 'task', mode: 'edit', index})}
                                    onDelete={() => removeTask(index)}
                                />
                            </Card>
                        )}
                    />
                )}
                {document.tasks_text && tasks.length === 0 && (
                    <div className="mt-2 rounded-md bg-zinc-50 px-4 py-3 text-[13px] text-muted-foreground">
                        <div className="mb-1 font-semibold text-zinc-700">
                            Existing tasks (markdown, kept as is). Add tasks above to replace them.
                        </div>
                        <div className="whitespace-pre-wrap">{document.tasks_text}</div>
                    </div>
                )}
            </div>

            <SubHeader title="Materials and equipment" />
            <div className="mb-[26px] grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
                <div>
                    <FieldLabel>Participants</FieldLabel>
                    <Textarea
                        value={materials.participants || ''}
                        onChange={(e) => setMaterial('participants', e.target.value)}
                        placeholder="e.g. A computer and internet access"
                    />
                </div>
                <div>
                    <FieldLabel>Trainer</FieldLabel>
                    <Textarea
                        value={materials.trainer || ''}
                        onChange={(e) => setMaterial('trainer', e.target.value)}
                        placeholder="e.g. Slides, examples, a timer"
                    />
                </div>
            </div>

            <SubHeader title="Take-home message" />
            <Textarea
                value={document.take_home || ''}
                onChange={(e) => onChange({take_home: e.target.value || undefined})}
                placeholder="The one message participants should remember"
            />
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
            <SectionCard id="sec-delivery" num={5} title="Tasks & materials" icon={ListChecks} refEl={sectionRefs.delivery}>
                <DeliverySection {...props} />
            </SectionCard>
            <SectionCard
                id="sec-prerequisites"
                num={6}
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
                id="sec-sources"
                num={7}
                title="Sources"
                icon={Library}
                refEl={sectionRefs.sources}
                action={
                    <Button size="sm" onClick={() => props.openDrawer({type: 'source', mode: 'add'})}>
                        + Add source
                    </Button>
                }
            >
                <SourcesSection {...props} />
            </SectionCard>
            <SectionCard
                id="sec-resources"
                num={8}
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
            <SectionCard id="sec-content" num={9} title="Content" icon={FileText} refEl={sectionRefs.content}>
                <ContentSection {...props} />
            </SectionCard>
        </>
    );
};

export default EditorSections;
