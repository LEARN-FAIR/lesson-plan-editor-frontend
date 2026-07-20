import React, {useMemo, useRef, useState} from 'react';
import {Check} from 'lucide-react';
import type {FairMarkdownDocument} from '../../types';
import {useContributors} from '../../services/contributorQueryHooks';
import EditorSections from './EditorSections';
import AddItemDrawer from './AddItemDrawer';
import {cn} from '../../lib/utils';
import {type DrawerRequest, type SectionKey, SECTIONS_META} from './editorTypes';

interface SinglePageEditorProps {
    document: FairMarkdownDocument;
    onDocumentChange: (updated: Partial<FairMarkdownDocument>) => void;
    owner?: string;
    repo?: string;
    branch?: string;
}

const computeCompletion = (doc: FairMarkdownDocument): Record<SectionKey, boolean> => {
    const activities = doc.activities || {before: [], during: [], after: []};
    const activityCount =
        (activities.before?.length || 0) + (activities.during?.length || 0) + (activities.after?.length || 0);
    return {
        general: !!(doc.title && doc.number && doc.description),
        authors: (doc.authors?.length || 0) > 0,
        outcomes: Object.keys(doc.learning_outcomes || {}).length > 0,
        activities: activityCount > 0,
        prerequisites: (doc.prerequisites?.length || 0) > 0,
        resources: (doc.additionalResources?.length || 0) > 0,
        content: !!(doc.content && doc.content.trim().length > 0),
    };
};

const SinglePageEditor: React.FC<SinglePageEditorProps> = ({
    document: doc,
    onDocumentChange,
    owner,
    repo,
    branch,
}) => {
    const {data: contributors = []} = useContributors(owner, repo, branch);
    const [drawer, setDrawer] = useState<DrawerRequest | null>(null);
    const [regionEl, setRegionEl] = useState<HTMLDivElement | null>(null);

    const sectionRefs: Record<SectionKey, React.RefObject<HTMLDivElement | null>> = {
        general: useRef<HTMLDivElement>(null),
        authors: useRef<HTMLDivElement>(null),
        outcomes: useRef<HTMLDivElement>(null),
        activities: useRef<HTMLDivElement>(null),
        prerequisites: useRef<HTMLDivElement>(null),
        resources: useRef<HTMLDivElement>(null),
        content: useRef<HTMLDivElement>(null),
    };

    const completion = useMemo(() => computeCompletion(doc), [doc]);
    const completeCount = Object.values(completion).filter(Boolean).length;
    const pct = Math.round((completeCount / SECTIONS_META.length) * 100);

    const jumpTo = (key: SectionKey) => {
        sectionRefs[key].current?.scrollIntoView({behavior: 'smooth', block: 'start'});
    };

    return (
        <div className="flex min-h-0 flex-1 flex-col">
            {/* Sticky jump-pill sub-header */}
            <div className="z-10 flex flex-shrink-0 flex-wrap items-center gap-4 border-b border-border bg-white px-8 py-3.5">
                <div className="flex flex-1 flex-wrap gap-1">
                    {SECTIONS_META.map((s) => (
                        <button
                            key={s.key}
                            type="button"
                            onClick={() => jumpTo(s.key)}
                            className="inline-flex cursor-pointer appearance-none items-center gap-1.5 rounded-md border-0 bg-zinc-100 px-3 py-[7px] text-[12.5px] font-semibold text-zinc-700 transition-colors hover:bg-zinc-200"
                        >
                            <span>
                                {s.num}. {s.label}
                            </span>
                            {completion[s.key] && <Check className="h-3.5 w-3.5 text-teal" strokeWidth={3} />}
                        </button>
                    ))}
                </div>
                <div className="flex items-center gap-2 whitespace-nowrap text-[12.5px] text-muted-foreground">
                    <div className="h-1.5 w-[70px] overflow-hidden rounded-full bg-zinc-200">
                        <div
                            className="h-full rounded-full bg-teal transition-[width] duration-300"
                            style={{width: `${pct}%`}}
                        />
                    </div>
                    <span>
                        {completeCount}/{SECTIONS_META.length}
                    </span>
                </div>
            </div>

            {/* Content region (relative anchor for the slide-over drawer) */}
            <div ref={setRegionEl} className="relative min-h-0 flex-1">
                <div className={cn('absolute inset-0 overflow-auto bg-zinc-50 px-8 pb-20 pt-7')}>
                    <div className="mx-auto max-w-[1100px]">
                        <EditorSections
                            document={doc}
                            onChange={onDocumentChange}
                            openDrawer={setDrawer}
                            contributors={contributors}
                            sectionRefs={sectionRefs}
                        />
                    </div>
                </div>

                <AddItemDrawer
                    request={drawer}
                    document={doc}
                    onChange={onDocumentChange}
                    onClose={() => setDrawer(null)}
                    contributors={contributors}
                    container={regionEl}
                />
            </div>
        </div>
    );
};

export default SinglePageEditor;
