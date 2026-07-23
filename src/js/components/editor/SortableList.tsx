import React from 'react';
import {
    DndContext,
    type DragEndEvent,
    KeyboardSensor,
    PointerSensor,
    closestCenter,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {CSS} from '@dnd-kit/utilities';
import {GripVertical} from 'lucide-react';
import {cn} from '../../lib/utils';

// Note: dnd-kit's verticalListSortingStrategy keeps motion vertical; we avoid
// @dnd-kit/modifiers so no extra dependency is required.

/** Props spread onto the caller's drag-handle element. */
export type DragHandleProps = React.HTMLAttributes<HTMLElement> & {ref?: React.Ref<HTMLElement>};

interface SortableListProps<T> {
    items: T[];
    /**
     * Content signature for an item (e.g. its value or a field). It need not be
     * unique — SortableList derives stable, unique drag ids from it that follow
     * each item across reorders. (dnd-kit reverts the drop if ids are tied to the
     * array index instead of the item's identity.)
     */
    getId: (item: T, index: number) => string;
    onReorder: (from: number, to: number) => void;
    /** Render a row; spread `handleProps` onto the element that should start a drag. */
    renderItem: (item: T, index: number, handleProps: DragHandleProps) => React.ReactNode;
    className?: string;
}

/**
 * Map each item's content signature to a stable unique drag id, reusing ids for
 * items that persist between renders so identity survives a reorder. Duplicate
 * signatures each get their own id (matched first-come-first-served).
 */
function useStableIds<T>(items: T[], getId: (item: T, index: number) => string): string[] {
    const counterRef = React.useRef(0);
    const prevRef = React.useRef<Map<string, string[]>>(new Map());

    return React.useMemo(() => {
        const available = new Map<string, string[]>();
        prevRef.current.forEach((queue, sig) => available.set(sig, [...queue]));

        const next = new Map<string, string[]>();
        const ids = items.map((item, index) => {
            const sig = getId(item, index);
            const reusable = available.get(sig);
            const id = reusable && reusable.length ? reusable.shift()! : `sid-${counterRef.current++}`;
            const bucket = next.get(sig);
            if (bucket) bucket.push(id);
            else next.set(sig, [id]);
            return id;
        });

        prevRef.current = next;
        return ids;
    }, [items, getId]);
}

const SortableRow: React.FC<{
    id: string;
    children: (handleProps: DragHandleProps) => React.ReactNode;
}> = ({id, children}) => {
    const {attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging} =
        useSortable({id});

    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn('relative', isDragging && 'z-10 opacity-80')}
        >
            {children({ref: setActivatorNodeRef, ...attributes, ...listeners})}
        </div>
    );
};

/** A grip icon styled as the standard drag handle. */
export const DragHandle = React.forwardRef<HTMLButtonElement, DragHandleProps>((props, ref) => (
    <button
        ref={ref as React.Ref<HTMLButtonElement>}
        type="button"
        aria-label="Drag to reorder"
        className="flex h-7 w-6 flex-shrink-0 cursor-grab touch-none appearance-none items-center justify-center rounded-md border-0 bg-transparent text-zinc-300 transition-colors hover:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing"
        {...(props as React.ButtonHTMLAttributes<HTMLButtonElement>)}
    >
        <GripVertical className="h-4 w-4" />
    </button>
));
DragHandle.displayName = 'DragHandle';

export function SortableList<T>({items, getId, onReorder, renderItem, className}: SortableListProps<T>) {
    const sensors = useSensors(
        useSensor(PointerSensor, {activationConstraint: {distance: 5}}),
        useSensor(KeyboardSensor, {coordinateGetter: sortableKeyboardCoordinates}),
    );

    const ids = useStableIds(items, getId);

    const handleDragEnd = (event: DragEndEvent) => {
        const {active, over} = event;
        if (!over || active.id === over.id) return;
        const from = ids.indexOf(String(active.id));
        const to = ids.indexOf(String(over.id));
        if (from !== -1 && to !== -1) onReorder(from, to);
    };

    return (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={ids} strategy={verticalListSortingStrategy}>
                <div className={className}>
                    {items.map((item, index) => (
                        <SortableRow key={ids[index]} id={ids[index]}>
                            {(handleProps) => renderItem(item, index, handleProps)}
                        </SortableRow>
                    ))}
                </div>
            </SortableContext>
        </DndContext>
    );
}
