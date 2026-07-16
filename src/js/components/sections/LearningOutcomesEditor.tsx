import React, {FC, useState} from 'react';
import {
    Box,
    Button,
    Chip,
    IconButton,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import TrackChangesIcon from '@mui/icons-material/TrackChanges';
import SectionHeader from '../common/SectionHeader';
import type {FairMarkdownDocument, LearningOutcome, LearningVerbLevel} from '../../types';
import LearningOutcomeEditorModal from '../modals/LearningOutcomeEditorModal';
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
import SortableRowWithActions from '../common/SortableRowWithActions';

interface LearningOutcomesEditorProps {
    document: FairMarkdownDocument;
    onChange: (updatedDocument: Partial<FairMarkdownDocument>) => void;
}

// Define a type for the level strings
type LevelString = 'beginner' | 'intermediate' | 'expert';

interface LevelSelections {
    beginner: boolean;
    intermediate: boolean;
    expert: boolean;
}

interface LevelVerbs {
    beginner: string;
    intermediate: string;
    expert: string;
}

const LearningOutcomesEditor: FC<LearningOutcomesEditorProps> = ({document, onChange}) => {
    const [modalOpen, setModalOpen] = useState(false);
    const [editMode, setEditMode] = useState<'add' | 'edit'>('add');
    const [currentOutcome, setCurrentOutcome] = useState<LearningOutcome | undefined>(undefined);
    const [currentOutcomeKey, setCurrentOutcomeKey] = useState<string>('');

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
            // Get the outcome keys in sorted order
            const sortedOutcomeKeys = Object.keys(document.learning_outcomes || {})
                .sort((keyA, keyB) => {
                    const numA = parseInt(keyA, 10);
                    const numB = parseInt(keyB, 10);
                    return numA - numB;
                });

            // Find the indices of the dragged and target items
            const oldIndex = sortedOutcomeKeys.findIndex(key => key === active.id.toString());
            const newIndex = sortedOutcomeKeys.findIndex(key => key === over.id.toString());

            // Create a new outcomes object with sequential keys
            const reorderedOutcomes: Record<string, LearningOutcome> = {};
            const reorderedKeys = arrayMove([...sortedOutcomeKeys], oldIndex, newIndex);

            // Create new keys based on index + 1 to maintain sequential numbering
            reorderedKeys.forEach((key, index) => {
                const newKey = (index + 1).toString();
                reorderedOutcomes[newKey] = document.learning_outcomes[key];
            });

            // Update with the reordered and re-keyed outcomes
            onChange({learning_outcomes: reorderedOutcomes});
        }
    };

    // Handle opening the modal for adding a new outcome
    const handleAddOutcome = () => {
        setCurrentOutcome(undefined);
        setCurrentOutcomeKey('');
        setEditMode('add');
        setModalOpen(true);
    };

    // Handle opening the modal for editing an existing outcome
    const handleEditOutcome = (outcome: LearningOutcome, key: string) => {
        setCurrentOutcome(outcome);
        setCurrentOutcomeKey(key);
        setEditMode('edit');
        setModalOpen(true);
    };

    // Handle removing an outcome
    const handleRemoveOutcome = (key: string) => {
        const {[key]: _, ...updatedOutcomes} = document.learning_outcomes;
        onChange({learning_outcomes: updatedOutcomes});
    };

    // Handle saving an outcome (new or edited)
    const handleSaveOutcome = (outcome: LearningOutcome, outcomeKey: string) => {
        if (editMode === 'add') {
            // Auto-generate the next outcome ID number for new outcomes
            const currentIds = Object.keys(document.learning_outcomes || {});
            let nextId = 1;

            if (currentIds.length > 0) {
                // Find the highest numeric ID and increment by 1
                const numericIds = currentIds
                    .map(id => parseInt(id, 10))
                    .filter(id => !isNaN(id));

                if (numericIds.length > 0) {
                    nextId = Math.max(...numericIds) + 1;
                }
            }

            const newKey = nextId.toString();

            const updatedOutcomes: Record<string, LearningOutcome> = {
                ...document.learning_outcomes,
                [newKey]: outcome
            };

            onChange({learning_outcomes: updatedOutcomes});
        } else {
            // Update existing outcome
            const updatedOutcomes: Record<string, LearningOutcome> = {
                ...document.learning_outcomes,
                [outcomeKey]: outcome
            };

            onChange({learning_outcomes: updatedOutcomes});
        }

        setModalOpen(false);
    };

    // Format verbs for display in table
    const formatVerbs = (verbs: LearningVerbLevel[] | undefined) => {
        return verbs ? verbs.map(v => v.verb ? `${v.verb} (${v.level})` : v.level).join(', ') : '';
    };

    // Get color for level display
    const getLevelColor = (verbs: LearningVerbLevel[] | undefined) => {
        if (!verbs || verbs.length === 0) return 'primary.main';
        if (verbs.some(v => v.level === 'expert')) return 'error.main';
        if (verbs.some(v => v.level === 'intermediate')) return 'secondary.main';
        return 'primary.main';
    };

    // Get highest level from verbs
    const getHighestLevel = (verbs: LearningVerbLevel[] | undefined) => {
        if (!verbs || verbs.length === 0) return '';
        if (verbs.some(v => v.level === 'expert')) return 'Expert';
        if (verbs.some(v => v.level === 'intermediate')) return 'Intermediate';
        if (verbs.some(v => v.level === 'beginner')) return 'Beginner';
        return '';
    };

    return (
        <Box>
            <SectionHeader
                icon={<TrackChangesIcon color="primary"/>}
                title="Learning outcomes"
                actions={
                    <Button
                        variant="contained"
                        startIcon={<AddIcon/>}
                        onClick={handleAddOutcome}
                    >
                        Add outcome
                    </Button>
                }
            />

            {Object.keys(document.learning_outcomes || {}).length === 0 ? (
                <Typography variant="body2" sx={{fontStyle: 'italic', my: 2}}>
                    No learning outcomes defined yet.
                </Typography>
            ) : (
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                >
                    <TableContainer component={Box} sx={{width: '100%'}}>
                        <Table sx={{width: '100%'}} aria-label="learning outcomes table">
                            <TableHead>
                                <TableRow>
                                    <TableCell width="50px">LO</TableCell>
                                    <TableCell>Outcome</TableCell>
                                    <TableCell>Verbs</TableCell>
                                    <TableCell width="120px"></TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                <SortableContext
                                    items={Object.keys(document.learning_outcomes || {})}
                                    strategy={verticalListSortingStrategy}
                                >
                                    {Object.entries(document.learning_outcomes || {})
                                        // Sort by numeric ID to ensure consistent display order
                                        .sort(([keyA], [keyB]) => {
                                            const numA = parseInt(keyA, 10);
                                            const numB = parseInt(keyB, 10);
                                            return numA - numB;
                                        })
                                        .map(([key, outcome]) => (
                                            <SortableRowWithActions 
                                                key={key} 
                                                id={key}
                                                actions={
                                                    <>
                                                        <IconButton
                                                            size="small"
                                                            color="primary"
                                                            onClick={() => handleEditOutcome(outcome, key)}
                                                            className="action-item"
                                                            sx={{ visibility: 'hidden', mr: 1 }}
                                                        >
                                                            <EditIcon fontSize="small"/>
                                                        </IconButton>
                                                        <IconButton
                                                            size="small"
                                                            color="error"
                                                            onClick={() => handleRemoveOutcome(key)}
                                                            className="action-item"
                                                            sx={{ visibility: 'hidden', mr: 1 }}
                                                        >
                                                            <DeleteIcon fontSize="small"/>
                                                        </IconButton>
                                                    </>
                                                }
                                            >
                                                <TableCell>{key}</TableCell>
                                                <TableCell>{outcome?.outcome || ''}</TableCell>
                                                <TableCell>
                                                    {outcome?.verbs && outcome.verbs.length > 0 ? (
                                                        <Box sx={{display: 'flex', flexWrap: 'wrap', gap: 1}}>
                                                            {outcome.verbs.map((verb, index) => (
                                                                <Chip
                                                                    key={index}
                                                                    label={verb.verb ? `${verb.verb}` : verb.level}
                                                                    size="small"
                                                                    color={
                                                                        verb.level === 'beginner' ? 'primary' :
                                                                            verb.level === 'intermediate' ? 'secondary' : 'error'
                                                                    }
                                                                />
                                                            ))}
                                                        </Box>
                                                    ) : (
                                                        <Typography variant="body2" color="text.secondary">No verbs defined</Typography>
                                                    )}
                                                </TableCell>
                                            </SortableRowWithActions>
                                        ))}
                                </SortableContext>
                            </TableBody>
                        </Table>
                    </TableContainer>
                </DndContext>
            )}

            <LearningOutcomeEditorModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                onSave={handleSaveOutcome}
                outcome={currentOutcome}
                outcomeKey={currentOutcomeKey}
                mode={editMode}
            />
        </Box>
    );
};

export default LearningOutcomesEditor;
