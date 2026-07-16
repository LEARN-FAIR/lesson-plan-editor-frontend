import React from 'react';
import { Box, IconButton, TableCell } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import SortableRowWithActions from '../common/SortableRowWithActions';

interface SortableTableRowProps {
    id: string;
    prerequisite: string;
    onEdit: (index: number) => void;
    onDelete: (index: number) => void;
    index: number;
}

const SortablePrerequisiteRow: React.FC<SortableTableRowProps> = ({ 
    id, 
    prerequisite, 
    onEdit, 
    onDelete, 
    index 
}) => {
    const actions = (
        <>
            <IconButton
                size="small"
                color="primary"
                onClick={() => onEdit(index)}
                className="action-item"
                sx={{ visibility: 'hidden', mr: 1 }}
            >
                <EditIcon fontSize="small"/>
            </IconButton>
            <IconButton
                size="small"
                color="error"
                onClick={() => onDelete(index)}
                className="action-item"
                sx={{ visibility: 'hidden', mr: 1 }}
            >
                <DeleteIcon fontSize="small"/>
            </IconButton>
        </>
    );

    return (
        <SortableRowWithActions id={id} actions={actions}>
            <TableCell>{prerequisite}</TableCell>
        </SortableRowWithActions>
    );
};

export default SortablePrerequisiteRow;
