import React, { ReactNode } from 'react';
import { TableRow, Box, IconButton, TableCell } from '@mui/material';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';

interface SortableRowWithActionsProps {
    id: string;
    children: ReactNode;
    actions?: ReactNode;
    showDragHandle?: boolean;
}

const SortableRowWithActions: React.FC<SortableRowWithActionsProps> = ({
    id,
    children,
    actions,
    showDragHandle = true
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
            {children}
            {(actions || showDragHandle) && (
                <TableCell align="right" padding="none">
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                        {actions}
                        {showDragHandle && (
                            <IconButton
                                size="small"
                                {...attributes}
                                {...listeners}
                                className="action-item"
                                sx={{ 
                                    visibility: 'hidden', 
                                    cursor: 'grab',
                                    '&:hover': { backgroundColor: 'transparent' }
                                }}
                                disableRipple
                            >
                                <DragIndicatorIcon
                                    fontSize="small"
                                    sx={{ color: 'text.secondary' }}
                                />
                            </IconButton>
                        )}
                    </Box>
                </TableCell>
            )}
        </TableRow>
    );
};

export default SortableRowWithActions;
