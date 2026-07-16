import React from 'react';
import {useSortable} from '@dnd-kit/sortable';
import {CSS} from '@dnd-kit/utilities';
import {ListItem, ListItemIcon} from '@mui/material';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';

interface SortableListItemProps {
    id: string;
    children: React.ReactNode;
}

const SortableListItem: React.FC<SortableListItemProps> = ({id, children}) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({id});

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        position: 'relative' as 'relative',
        zIndex: isDragging ? 1 : 0
    };

    return (
        <ListItem
            ref={setNodeRef}
            style={style}
            divider
            sx={{
                cursor: 'default',
                '&:hover .drag-handle': {
                    visibility: 'visible',
                }
            }}
        >
            <ListItemIcon
                sx={{
                    minWidth: '36px',
                    visibility: 'hidden',
                    cursor: 'grab',
                }}
                className="drag-handle"
                {...attributes}
                {...listeners}
            >
                <DragIndicatorIcon fontSize="small"/>
            </ListItemIcon>
            {children}
        </ListItem>
    );
};

export default SortableListItem;
