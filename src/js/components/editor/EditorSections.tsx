import React, {useEffect, useState} from 'react';
import {Check, Pencil, X} from 'lucide-react';
import {useQueryClient} from '@tanstack/react-query';
import type {Activity, FairMarkdownDocument, LearningVerbLevel} from '../../types';
import type {Contributor} from '../../services/contributorService';
import customContributorService from '../../services/customContributorService';
import {getActivityLearningOutcomes} from '../../utils/activityUtils';
import MdxEditorComponent from '../common/MdxEditorComponent';
import {Button} from '../ui/button';
import {Badge} from '../ui/badge';
import {Input} from '../ui/input';
import {Card} from '../ui/card';
import {Avatar, AvatarFallback} from '../ui/avatar';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '../ui/select';
import {cn} from '../../lib/utils';
import {initialsOf, type OpenDrawer, resolveAuthor, type SectionKey} from './editorTypes';

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
    <div className={cn('mb-1 text-xs text-muted-foreground', className)}>{children}</div>
);

const SectionCard: React.FC<{
    id: string;
    num: number;
    title: string;
    refEl: React.RefObject<HTMLDivElement | null>;
    children: React.ReactNode;
}> = ({id, num, title, refEl, children}) => (
    <div ref={refEl} id={id} className="mb-9 scroll-mt-3">
        <div className="mb-[18px] text-[19px] font-semibold text-navy">
            {num}. {title}
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
                            <SelectValue placeholder="Select status" />
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

            <FieldLabel className="mb-1.5">Description</FieldLabel>
            <div className="overflow-hidden rounded-card border border-border bg-zinc-50">
                <MdxEditorComponent
                    markdown={document.description || ''}
                    onChange={(value) => onChange({description: value})}
                    minHeight="120px"
                    maxHeight="300px"
                    placeholder="Enter a description for this lesson plan…"
                    showToolbar={true}
                    showDiffToggle={false}
                />
            </div>
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
}> = ({id, contributors, onSave, onDelete}) => {
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
            <div className="flex items-center gap-3.5">
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

    const saveInline = (list: 'authors' | 'reviewers', index: number) => (name: string, orcid: string) => {
        const current = [...(document[list] || [])];
        const newId = upsertAuthorId(name, orcid, current[index]);
        current[index] = newId;
        queryClient.invalidateQueries({queryKey: ['contributors']});
        onChange({[list]: current});
    };

    const remove = (list: 'authors' | 'reviewers', index: number) => () => {
        const current = [...(document[list] || [])];
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
            <div className="mb-[26px] flex flex-col gap-2.5">
                {(document.authors || []).length === 0 ? (
                    <EmptyState>No authors yet.</EmptyState>
                ) : (
                    document.authors.map((id, index) => (
                        <AuthorRow
                            key={`${id}-${index}`}
                            id={id}
                            contributors={contributors}
                            onSave={saveInline('authors', index)}
                            onDelete={remove('authors', index)}
                        />
                    ))
                )}
            </div>

            <SubHeader title="Reviewers">
                <Button size="sm" variant="secondary" onClick={() => openDrawer({type: 'reviewer', mode: 'add'})}>
                    + Add reviewer
                </Button>
            </SubHeader>
            <div className="flex flex-col gap-2.5">
                {(document.reviewers || []).length === 0 ? (
                    <EmptyState>No reviewers yet.</EmptyState>
                ) : (
                    document.reviewers.map((id, index) => (
                        <AuthorRow
                            key={`${id}-${index}`}
                            id={id}
                            contributors={contributors}
                            onSave={saveInline('reviewers', index)}
                            onDelete={remove('reviewers', index)}
                        />
                    ))
                )}
            </div>
        </>
    );
};

/* ------------------------------------------------------------------ */
/* 3. Learning outcomes                                              */
/* ------------------------------------------------------------------ */

const OutcomesSection: React.FC<SectionProps> = ({document, onChange, openDrawer}) => {
    const outcomes = document.learning_outcomes || {};
    const keys = Object.keys(outcomes).sort((a, b) => parseInt(a, 10) - parseInt(b, 10));

    const remove = (key: string) => {
        const {[key]: _removed, ...rest} = outcomes;
        onChange({learning_outcomes: rest});
    };

    return (
        <>
            <div className="mb-3.5 flex justify-end">
                <Button size="sm" onClick={() => openDrawer({type: 'outcome', mode: 'add'})}>
                    + Add outcome
                </Button>
            </div>
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
    const removeActivity = (section: 'before' | 'during' | 'after', index: number) => {
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
                            <div className="flex flex-col gap-2.5">
                                {items.map((activity, index) => {
                                    const los = getActivityLearningOutcomes(activity);
                                    return (
                                        <Card key={index} className={cn(rowCard, 'flex items-start gap-3.5')}>
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
                                })}
                            </div>
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
    const items = document.prerequisites || [];
    const remove = (index: number) => {
        const list = [...items];
        list.splice(index, 1);
        onChange({prerequisites: list});
    };

    return (
        <>
            <div className="mb-3.5 flex justify-end">
                <Button size="sm" onClick={() => openDrawer({type: 'prerequisite', mode: 'add'})}>
                    + Add prerequisite
                </Button>
            </div>
            <div className="flex flex-col gap-2.5">
                {items.length === 0 ? (
                    <EmptyState>No prerequisites yet.</EmptyState>
                ) : (
                    items.map((prerequisite, index) => (
                        <Card key={index} className={cn(rowCard, 'flex items-center gap-3 py-3')}>
                            <Check className="h-[18px] w-[18px] flex-shrink-0 text-teal" />
                            <div className="flex-1 text-sm text-zinc-900">{prerequisite}</div>
                            <RowActions
                                onEdit={() => openDrawer({type: 'prerequisite', mode: 'edit', index})}
                                onDelete={() => remove(index)}
                            />
                        </Card>
                    ))
                )}
            </div>
        </>
    );
};

/* ------------------------------------------------------------------ */
/* 6. Additional resources                                           */
/* ------------------------------------------------------------------ */

const resourceMeta = (r: {author?: string; url?: string; doi?: string}): string =>
    [r.author, r.doi ? `DOI: ${r.doi}` : r.url].filter(Boolean).join(' · ');

const ResourcesSection: React.FC<SectionProps> = ({document, onChange, openDrawer}) => {
    const items = document.additionalResources || [];
    const remove = (index: number) => {
        const list = [...items];
        list.splice(index, 1);
        onChange({additionalResources: list});
    };

    return (
        <>
            <div className="mb-3.5 flex justify-end">
                <Button size="sm" onClick={() => openDrawer({type: 'resource', mode: 'add'})}>
                    + Add resource
                </Button>
            </div>
            <div className="flex flex-col gap-2.5">
                {items.length === 0 ? (
                    <EmptyState>No resources yet.</EmptyState>
                ) : (
                    items.map((resource, index) => (
                        <Card key={index} className={cn(rowCard, 'flex items-center gap-3.5')}>
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
                    ))
                )}
            </div>
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
            <SectionCard id="sec-general" num={1} title="General information" refEl={sectionRefs.general}>
                <GeneralSection {...props} />
            </SectionCard>
            <SectionCard id="sec-authors" num={2} title="Authors & reviewers" refEl={sectionRefs.authors}>
                <AuthorsSection {...props} />
            </SectionCard>
            <SectionCard id="sec-outcomes" num={3} title="Learning outcomes" refEl={sectionRefs.outcomes}>
                <OutcomesSection {...props} />
            </SectionCard>
            <SectionCard id="sec-activities" num={4} title="Activities" refEl={sectionRefs.activities}>
                <ActivitiesSection {...props} />
            </SectionCard>
            <SectionCard id="sec-prerequisites" num={5} title="Prerequisites" refEl={sectionRefs.prerequisites}>
                <PrerequisitesSection {...props} />
            </SectionCard>
            <SectionCard id="sec-resources" num={6} title="Additional resources" refEl={sectionRefs.resources}>
                <ResourcesSection {...props} />
            </SectionCard>
            <SectionCard id="sec-content" num={7} title="Content" refEl={sectionRefs.content}>
                <ContentSection {...props} />
            </SectionCard>
        </>
    );
};

export default EditorSections;
