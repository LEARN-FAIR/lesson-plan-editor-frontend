import React, {useState} from 'react';
import {Box, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import type {Activity, FairMarkdownDocument} from '../../types';
import ActivityEditorModal from '../modals/ActivityEditorModal';
import SectionHeader from '../common/SectionHeader';
import RestoreIcon from '@mui/icons-material/Restore';
import UpdateIcon from '@mui/icons-material/Update';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import SortableActivityRow from './SortableActivityRow';
import {
    closestCenter,
    DndContext,
    type DragEndEvent,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors
} from '@dnd-kit/core';
import {arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy} from '@dnd-kit/sortable';

interface ActivitiesEditorProps {
    document: FairMarkdownDocument;
    onChange: (updatedDocument: Partial<FairMarkdownDocument>) => void;
}

interface ActivitySectionProps {
    title: string;
    icon: React.ReactNode;
    section: 'before' | 'during' | 'after';
    activities: Activity[];
    learningOutcomes: Record<string, { outcome: string }>;
    onAddActivity: (section: 'before' | 'during' | 'after') => void;
    onEditActivity: (activity: Activity, index: number, section: 'before' | 'during' | 'after') => void;
    onRemoveActivity: (section: 'before' | 'during' | 'after', index: number) => void;
    onReorderActivities: (section: 'before' | 'during' | 'after', activities: Activity[]) => void;
}

function ActivitySection(props: ActivitySectionProps) {
    const {
        title,
        icon,
        section,
        activities,
        learningOutcomes,
        onAddActivity,
        onEditActivity,
        onRemoveActivity,
        onReorderActivities
    } = props;

    // Set up sensors for drag and drop
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8, // Minimum distance before drag starts
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    // Handle drag end event
    const handleDragEnd = (event: DragEndEvent) => {
        const {active, over} = event;

        if (over && active.id !== over.id) {
            const oldIndex = parseInt(active.id.toString().split('-')[1]);
            const newIndex = parseInt(over.id.toString().split('-')[1]);

            // Create a new array with the reordered items
            // This allows the animation to complete properly
            const reorderedActivities = arrayMove([...activities], oldIndex, newIndex);
            onReorderActivities(section, reorderedActivities);
        }
    };

    return (
        <Box sx={{mb: 4}}>
            <SectionHeader
                icon={icon}
                title={title}
                actions={
                    <Button
                        variant="contained"
                        startIcon={<AddIcon/>}
                        onClick={() => onAddActivity(section)}
                    >
                        Add activity
                    </Button>
                }
            />

            {activities.length === 0 ? (
                <Typography variant="body2" sx={{fontStyle: 'italic', my: 2}}>
                    No activities defined for this section.
                </Typography>
            ) : (
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                >
                    <TableContainer component={Box}>
                        <Table sx={{minWidth: 650}} aria-label="activities table">
                            <TableHead>
                                <TableRow>
                                    <TableCell width="50px">LO</TableCell>
                                    <TableCell>Activity</TableCell>
                                    <TableCell width="100px">Time</TableCell>
                                    <TableCell width="140px">Type</TableCell>
                                    <TableCell width="120px">Level</TableCell>
                                    <TableCell width="120px"></TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                <SortableContext
                                    items={activities.map((_, index) => `${section}-${index}`)}
                                    strategy={verticalListSortingStrategy}
                                >
                                    {activities.map((activity, index) => (
                                        <SortableActivityRow
                                            key={`${section}-${index}`}
                                            id={`${section}-${index}`}
                                            activity={activity}
                                            index={index}
                                            learningOutcomes={learningOutcomes}
                                            onEdit={(activity, index) => onEditActivity(activity, index, section)}
                                            onRemove={(index) => onRemoveActivity(section, index)}
                                        />
                                    ))}
                                </SortableContext>
                            </TableBody>
                        </Table>
                    </TableContainer>
                </DndContext>
            )}
        </Box>
    );
}

const ActivitiesEditor: React.FC<ActivitiesEditorProps> = ({document, onChange}) => {
    const [modalOpen, setModalOpen] = useState(false);
    const [editMode, setEditMode] = useState<'add' | 'edit'>('add');
    const [currentActivity, setCurrentActivity] = useState<Activity | undefined>(undefined);
    const [currentActivityIndex, setCurrentActivityIndex] = useState<number>(-1);
    const [currentSection, setCurrentSection] = useState<'before' | 'during' | 'after'>('before');

    // Handle reordering of activities
    const handleReorderActivities = (section: 'before' | 'during' | 'after', reorderedActivities: Activity[]) => {
        const updatedActivities = {...document.activities};
        updatedActivities[section] = reorderedActivities;
        onChange({activities: updatedActivities});
    };

    const handleOpenAddModal = (section: 'before' | 'during' | 'after') => {
        setEditMode('add');
        setCurrentActivity(undefined);
        setCurrentActivityIndex(-1);
        setCurrentSection(section);
        setModalOpen(true);
    };

    const handleOpenEditModal = (activity: Activity, index: number, section: 'before' | 'during' | 'after') => {
        setEditMode('edit');
        setCurrentActivity(activity);
        setCurrentActivityIndex(index);
        setCurrentSection(section);
        setModalOpen(true);
    };

    const handleCloseModal = () => {
        setModalOpen(false);
    };

    const handleSaveActivity = (activityData: Activity) => {
        if (editMode === 'add') {
            // Add new activity
            const updatedActivities = {
                ...document.activities,
                [currentSection]: [...(document.activities?.[currentSection] || []), activityData]
            };

            onChange({activities: updatedActivities});
        } else {
            // Edit existing activity
            const updatedSectionActivities = [...(document.activities?.[currentSection] || [])];
            updatedSectionActivities[currentActivityIndex] = activityData;

            const updatedActivities = {
                ...document.activities,
                [currentSection]: updatedSectionActivities
            };

            onChange({activities: updatedActivities});
        }

        setModalOpen(false);
    };

    const handleRemoveActivity = (section: 'before' | 'during' | 'after', index: number) => {
        const updatedSectionActivities = [...(document.activities?.[section] || [])];
        updatedSectionActivities.splice(index, 1);

        const updatedActivities = {
            ...document.activities,
            [section]: updatedSectionActivities
        };

        onChange({activities: updatedActivities});
    };

    return (
        <Box>
            <ActivitySection
                title="Activities before the lesson"
                icon={<RestoreIcon color="primary"/>}
                section="before"
                activities={document.activities?.before || []}
                learningOutcomes={document.learning_outcomes || {}}
                onAddActivity={handleOpenAddModal}
                onEditActivity={handleOpenEditModal}
                onRemoveActivity={handleRemoveActivity}
                onReorderActivities={handleReorderActivities}
            />

            <ActivitySection
                title="Activities during the lesson"
                icon={<AccessTimeIcon color="primary"/>}
                section="during"
                activities={document.activities?.during || []}
                learningOutcomes={document.learning_outcomes || {}}
                onAddActivity={handleOpenAddModal}
                onEditActivity={handleOpenEditModal}
                onRemoveActivity={handleRemoveActivity}
                onReorderActivities={handleReorderActivities}
            />

            <ActivitySection
                title="Activities after the lesson"
                icon={<UpdateIcon color="primary"/>}
                section="after"
                activities={document.activities?.after || []}
                learningOutcomes={document.learning_outcomes || {}}
                onAddActivity={handleOpenAddModal}
                onEditActivity={handleOpenEditModal}
                onRemoveActivity={handleRemoveActivity}
                onReorderActivities={handleReorderActivities}
            />

            <ActivityEditorModal
                open={modalOpen}
                onClose={handleCloseModal}
                onSave={handleSaveActivity}
                activity={currentActivity}
                learningOutcomes={document.learning_outcomes || {}}
                mode={editMode}
            />
        </Box>
    );
};

export default ActivitiesEditor;
