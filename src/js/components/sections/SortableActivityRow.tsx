import React from 'react';
import {Box, IconButton, TableCell, Tooltip} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import ReactMarkdown from 'react-markdown';
import SortableRowWithActions from '../common/SortableRowWithActions';
import type {Activity} from '../../types';
import {getActivityLearningOutcomes} from '../../utils/activityUtils';

interface SortableActivityRowProps {
    activity: Activity;
    id: string;
    index: number;
    onEdit: (activity: Activity, index: number) => void;
    onRemove: (index: number) => void;
    learningOutcomes?: Record<string, { outcome: string }>;
}

const SortableActivityRow: React.FC<SortableActivityRowProps> = ({
                                                                      activity,
                                                                      id,
                                                                      index,
                                                                      onEdit,
                                                                      onRemove,
                                                                      learningOutcomes
                                                                  }) => {
    const actions = (
        <>
            <IconButton
                size="small"
                color="primary"
                onClick={() => onEdit(activity, index)}
                className="action-item"
                sx={{ visibility: 'hidden', mr: 1 }}
            >
                <EditIcon fontSize="small"/>
            </IconButton>
            <IconButton
                size="small"
                color="error"
                onClick={() => onRemove(index)}
                className="action-item"
                sx={{ visibility: 'hidden', mr: 1 }}
            >
                <DeleteIcon fontSize="small"/>
            </IconButton>
        </>
    );
    
    const learningOutcomeIds = getActivityLearningOutcomes(activity);

    return (
        <SortableRowWithActions id={id} actions={actions}>
            <TableCell>
                <Box sx={{display: 'flex', flexWrap: 'wrap', gap: 0.5}}>
                    {learningOutcomeIds.map((lo, i) => (
                        <Tooltip
                            key={lo}
                            title={learningOutcomes?.[String(lo)]?.outcome || 'No description available'}
                            arrow
                            placement="top"
                        >
                            <Box component="span" sx={{cursor: 'help'}}>
                                {lo}{i < learningOutcomeIds.length - 1 ? ',' : ''}
                            </Box>
                        </Tooltip>
                    ))}
                </Box>
            </TableCell>
            <TableCell>
                <Box sx={{maxHeight: '100px', overflow: 'auto'}}>
                    <ReactMarkdown>
                        {typeof activity.activities === 'string'
                            ? activity.activities
                            : activity.activities.join("\n")}
                    </ReactMarkdown>
                </Box>
            </TableCell>
            <TableCell>{activity.time}</TableCell>
            <TableCell>{activity.type}</TableCell>
            <TableCell>{activity.level}</TableCell>
        </SortableRowWithActions>
    );
};

export default SortableActivityRow;
