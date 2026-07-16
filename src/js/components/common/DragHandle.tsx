import React from 'react';
import {IconButton, TableCell} from '@mui/material';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';

interface DragHandleProps {
    attributes?: any;
    listeners?: any;
}

const DragHandle: React.FC<DragHandleProps> = ({attributes, listeners}) => {
    return (
        <TableCell padding="none" width="40px">
            <IconButton
                size="small"
                {...attributes}
                {...listeners}
                sx={{cursor: 'grab'}}
            >
                <DragIndicatorIcon fontSize="small"/>
            </IconButton>
        </TableCell>
    );
};

export default DragHandle;
