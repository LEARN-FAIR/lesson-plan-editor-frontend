import React, {useEffect, useState} from 'react';
import {
    Box,
    Button,
    Checkbox,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControl,
    InputLabel,
    ListItemText,
    MenuItem,
    OutlinedInput,
    Select,
    TextField,
    Typography
} from '@mui/material';
import type {Activity} from '../../types';
import {getActivityLearningOutcomes} from '../../utils/activityUtils';
import MdxEditorComponent from '../common/MdxEditorComponent';

interface ActivityEditorModalProps {
    open: boolean;
    onClose: () => void;
    onSave: (activity: Activity) => void;
    activity?: Activity;
    learningOutcomes: Record<string, { outcome: string }>;
    mode: 'add' | 'edit';
}

const ActivityEditorModal: React.FC<ActivityEditorModalProps> = ({
                                                                     open,
                                                                     onClose,
                                                                     onSave,
                                                                     activity,
                                                                     learningOutcomes,
                                                                     mode
                                                                 }) => {
    const [formData, setFormData] = useState<{
        learning_outcomes: string[];
        activities: string;
        time: string;
        type: string;
        level: 'beginner' | 'intermediate' | 'expert';
    }>({
        learning_outcomes: [],
        activities: '',
        time: '',
        type: '',
        level: 'beginner'
    });

    // Initialize form data when editing an existing activity
    useEffect(() => {
        if (activity && mode === 'edit') {
            setFormData({
                learning_outcomes: getActivityLearningOutcomes(activity).map((lo) => lo.toString()),
                activities: typeof activity.activities === 'string'
                    ? activity.activities
                    : activity.activities.join("\n"),
                time: activity.time,
                type: activity.type,
                level: activity.level
            });
        } else {
            // Reset form when adding a new activity
            setFormData({
                learning_outcomes: [],
                activities: '',
                time: '',
                type: '',
                level: 'beginner'
            });
        }
    }, [activity, mode]);

    const handleFormChange = (field: keyof typeof formData) => (
        event: React.ChangeEvent<HTMLInputElement | { value: unknown }>
    ) => {
        setFormData({
            ...formData,
            [field]: event.target.value
        });
    };

    const handleLearningOutcomesChange = (value: string | string[]) => {
        setFormData({
            ...formData,
            learning_outcomes: typeof value === 'string' ? value.split(',') : value
        });
    };

    const handleActivitiesChange = (value: string) => {
        setFormData({
            ...formData,
            activities: value
        });
    };

    const handleSave = () => {
        // Validate required fields
        if (formData.learning_outcomes.length === 0 || !formData.activities || !formData.time || !formData.type) {
            return;
        }

        const activityData: Activity = {
            learning_outcomes: formData.learning_outcomes
                .map((lo) => parseInt(lo, 10))
                .filter((lo) => !Number.isNaN(lo)),
            activities: formData.activities,
            time: formData.time,
            type: formData.type,
            level: formData.level
        };

        onSave(activityData);
        onClose();
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            fullWidth
            maxWidth="md"
        >
            <DialogTitle>
                {mode === 'add' ? 'Add activity' : 'Edit activity'}
            </DialogTitle>

            <DialogContent>
                <Box sx={{
                    display: 'grid',
                    gridTemplateColumns: {xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr 1fr'},
                    gap: 2,
                    mt: 2
                }}>
                    <Box>
                        <FormControl fullWidth size="small">
                            <InputLabel>Learning outcomes</InputLabel>
                            <Select
                                multiple
                                value={formData.learning_outcomes}
                                input={<OutlinedInput label="Learning outcomes"/>}
                                onChange={(event) => handleLearningOutcomesChange(event.target.value)}
                                renderValue={(selected) => (
                                    <Box sx={{display: 'flex', flexWrap: 'wrap', gap: 0.5}}>
                                        {(selected as string[])
                                            .slice()
                                            .sort((a, b) => parseInt(a, 10) - parseInt(b, 10))
                                            .map((value) => (
                                                <Chip key={value} label={value} size="small"/>
                                            ))}
                                    </Box>
                                )}
                            >
                                {Object.entries(learningOutcomes || {})
                                    // Sort by numeric ID to ensure consistent display order
                                    .sort(([keyA], [keyB]) => {
                                        const numA = parseInt(keyA, 10);
                                        const numB = parseInt(keyB, 10);
                                        return numA - numB;
                                    })
                                    .map(([key, outcome]) => (
                                        <MenuItem key={key} value={key}>
                                            <Checkbox
                                                checked={formData.learning_outcomes.indexOf(key) > -1}
                                                size="small"/>
                                            <ListItemText
                                                primary={`${key}: ${outcome.outcome.substring(0, 50)}${outcome.outcome.length > 50 ? '...' : ''}`}/>
                                        </MenuItem>
                                    ))}
                            </Select>
                        </FormControl>
                    </Box>

                    <Box>
                        <TextField
                            fullWidth
                            label="Time"
                            placeholder="e.g., 30 min"
                            value={formData.time}
                            onChange={handleFormChange('time')}
                            size="small"
                        />
                    </Box>

                    <Box>
                        <TextField
                            fullWidth
                            label="Type"
                            placeholder="e.g., lecture, workshop"
                            value={formData.type}
                            onChange={handleFormChange('type')}
                            size="small"
                        />
                    </Box>

                    <Box>
                        <FormControl fullWidth size="small">
                            <InputLabel>Level</InputLabel>
                            <Select
                                value={formData.level}
                                label="Level"
                                onChange={handleFormChange('level') as any}
                            >
                                <MenuItem value="beginner">Beginner</MenuItem>
                                <MenuItem value="intermediate">Intermediate</MenuItem>
                                <MenuItem value="expert">Expert</MenuItem>
                            </Select>
                        </FormControl>
                    </Box>

                    <Box sx={{gridColumn: '1/-1', mt: 1}}>
                        <Typography variant="subtitle2" gutterBottom>
                            Activities Description
                        </Typography>
                        <Box sx={{border: '1px solid #ccc', borderRadius: '4px'}}>
                            <MdxEditorComponent
                                markdown={formData.activities || ''}
                                onChange={handleActivitiesChange}
                                minHeight="200px"
                                maxHeight="400px"
                                placeholder="Describe the activities here..."
                                showToolbar={true}
                                showDiffToggle={false}
                            />
                        </Box>
                    </Box>
                </Box>
            </DialogContent>

            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button
                    variant="contained"
                    onClick={handleSave}
                    disabled={formData.learning_outcomes.length === 0 || !formData.activities || !formData.time || !formData.type}
                >
                    {mode === 'add' ? 'Add' : 'Save'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default ActivityEditorModal;
