import React, {useEffect, useMemo, useRef, useState} from 'react';
import {Check} from 'lucide-react';
import type {FairMarkdownDocument} from '../../types';
import {useContributors} from '../../services/contributorQueryHooks';
import EditorSections from './EditorSections';
import AddItemDrawer from './AddItemDrawer';
import {ConfirmProvider} from '../ui/confirm-dialog';
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
    const scrollRef = useRef<HTMLDivElement>(null);
    const [activeSection, setActiveSection] = useState<SectionKey>('general');

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

    // Highlight the section whose heading has scrolled up past a strip just below
    // the sticky sub-header. Computed directly from scroll offsets (rather than an
    // IntersectionObserver) so it's deterministic regardless of section heights.
    useEffect(() => {
        const root = scrollRef.current;
        if (!root) return;
        const onScroll = () => {
            const threshold = root.getBoundingClientRect().top + 120;
            let current: SectionKey = SECTIONS_META[0].key;
            for (const {key} of SECTIONS_META) {
                const el = sectionRefs[key].current;
                if (el && el.getBoundingClientRect().top <= threshold) current = key;
            }
            setActiveSection(current);
        };
        onScroll();
        root.addEventListener('scroll', onScroll, {passive: true});
        return () => root.removeEventListener('scroll', onScroll);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const jumpTo = (key: SectionKey) => {
        setActiveSection(key);
        sectionRefs[key].current?.scrollIntoView({behavior: 'smooth', block: 'start'});
    };

    return (
        <ConfirmProvider>
        <div className="flex min-h-0 flex-1 flex-col">
            {/* Sticky jump-pill sub-header */}
            <div className="z-10 flex flex-shrink-0 flex-wrap items-center gap-4 border-b border-border bg-white px-8 py-3.5">
                <div className="flex flex-1 flex-wrap gap-1">
                    {SECTIONS_META.map((s) => {
                        const isActive = activeSection === s.key;
                        return (
                            <button
                                key={s.key}
                                type="button"
                                onClick={() => jumpTo(s.key)}
                                aria-current={isActive ? 'true' : undefined}
                                className={cn(
                                    'inline-flex cursor-pointer appearance-none items-center gap-1.5 rounded-md border-0 px-3 py-[7px] text-[12.5px] font-semibold transition-colors',
                                    isActive
                                        ? 'bg-navy text-white'
                                        : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200',
                                )}
                            >
                                <span>
                                    {s.num}. {s.label}
                                </span>
                                {completion[s.key] && (
                                    <Check
                                        className={cn('h-3.5 w-3.5', isActive ? 'text-white' : 'text-teal')}
                                        strokeWidth={3}
                                    />
                                )}
                            </button>
                        );
                    })}
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
                <div ref={scrollRef} className={cn('absolute inset-0 overflow-auto bg-zinc-50 px-8 pb-20 pt-7')}>
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
        </ConfirmProvider>
    );
};

export default SinglePageEditor;
