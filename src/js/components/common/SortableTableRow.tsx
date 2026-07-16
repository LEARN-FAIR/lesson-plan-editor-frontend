import React, {memo, ReactNode} from 'react';
import {TableRow} from '@mui/material';
import {useSortable} from '@dnd-kit/sortable';
import {CSS} from '@dnd-kit/utilities';

interface SortableTableRowProps {
    id: string;
    children: ReactNode | ((props: { attributes: any, listeners: any }) => ReactNode);
}

const SortableTableRow: React.FC<SortableTableRowProps> = ({
                                                               id,
                                                               children
                                                           }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({
        id,
        animateLayoutChanges: () => false // Prevent automatic layout animations
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition: transition || 'transform 250ms cubic-bezier(0.2, 1, 0.1, 1)',
        opacity: isDragging ? 0.5 : 1,
        cursor: isDragging ? 'grabbing' : 'default',
        backgroundColor: isDragging ? '#f5f5f5' : 'transparent',
        position: 'relative' as const,
        zIndex: isDragging ? 999 : 'auto'
    };

    // Handle the case where children is a function
    const renderChildren = () => {
        if (typeof children === 'function') {
            return children({ attributes, listeners });
        }
        return children;
    };

    return (
        <TableRow
            ref={setNodeRef}
            style={style}
            hover
            sx={{
                '&:hover .action-item': {
                    visibility: 'visible',
                },
                '&:last-child td, &:last-child th': { border: 0 },
            }}
        >
            {renderChildren()}
        </TableRow>
    );
};

export default memo(SortableTableRow);
