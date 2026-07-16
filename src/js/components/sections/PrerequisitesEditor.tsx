import React, {useState} from 'react';
import {
    Box, Button, IconButton, Typography, Table, TableBody, TableCell, 
    TableContainer, TableHead, TableRow
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import ChecklistIcon from '@mui/icons-material/Checklist';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import SectionHeader from '../common/SectionHeader';
import PrerequisiteEditorModal from '../modals/PrerequisiteEditorModal';
import type {FairMarkdownDocument} from '../../types';
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
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import SortablePrerequisiteRow from './SortablePrerequisiteRow';

interface PrerequisitesEditorProps {
    document: FairMarkdownDocument;
    onChange: (updatedDocument: Partial<FairMarkdownDocument>) => void;
}

const PrerequisitesEditor: React.FC<PrerequisitesEditorProps> = ({document, onChange}) => {
    const [modalOpen, setModalOpen] = useState(false);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [isEditing, setIsEditing] = useState(false);

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
            const oldIndex = parseInt(active.id.toString(), 10);
            const newIndex = parseInt(over.id.toString(), 10);

            // Create a new array with the reordered items
            // This allows the animation to complete properly
            const updatedPrerequisites = arrayMove(
                [...(document.prerequisites || [])],
                oldIndex,
                newIndex
            );

            onChange({prerequisites: updatedPrerequisites});
        }
    };

    const handleOpenAddModal = () => {
        setIsEditing(false);
        setEditingIndex(null);
        setModalOpen(true);
    };

    const handleOpenEditModal = (index: number) => {
        setIsEditing(true);
        setEditingIndex(index);
        setModalOpen(true);
    };

    const handleCloseModal = () => {
        setModalOpen(false);
        setEditingIndex(null);
    };

    const handleSavePrerequisite = (prerequisite: string) => {
        if (!prerequisite.trim()) return;

        const updatedPrerequisites = [...(document.prerequisites || [])];

        if (isEditing && editingIndex !== null) {
            // Update existing prerequisite
            updatedPrerequisites[editingIndex] = prerequisite;
        } else {
            // Add new prerequisite
            updatedPrerequisites.push(prerequisite);
        }

        onChange({prerequisites: updatedPrerequisites});
    };

    const handleRemovePrerequisite = (index: number) => {
        const updatedPrerequisites = [...document.prerequisites];
        updatedPrerequisites.splice(index, 1);
        onChange({prerequisites: updatedPrerequisites});
    };


    return (
        <Box>
            <SectionHeader
                icon={<ChecklistIcon color="primary"/>}
                title="Prerequisites"
                actions={<Button
                    variant="contained"
                    startIcon={<AddIcon/>}
                    onClick={handleOpenAddModal}
                >
                    Add prerequisite
                </Button>}
            />

            <PrerequisiteEditorModal
                open={modalOpen}
                onClose={handleCloseModal}
                onSave={handleSavePrerequisite}
                initialValue={isEditing && editingIndex !== null ? document.prerequisites[editingIndex] : ''}
                isEditing={isEditing}
            />

            {document.prerequisites && document.prerequisites.length > 0 ? (
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                >
                    <TableContainer component={Box} sx={{width: '100%', mb: 2}}>
                        <Table sx={{width: '100%'}} aria-label="prerequisites table">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Prerequisite</TableCell>
                                    <TableCell align="right" width="120px"></TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                <SortableContext
                                    items={document.prerequisites.map((_, index) => index.toString())}
                                    strategy={verticalListSortingStrategy}
                                >
                                    {document.prerequisites.map((prerequisite, index) => (
                                        <SortablePrerequisiteRow 
                                            key={index} 
                                            id={index.toString()}
                                            prerequisite={prerequisite}
                                            onEdit={handleOpenEditModal}
                                            onDelete={handleRemovePrerequisite}
                                            index={index}
                                        />
                                    ))}
                                </SortableContext>
                            </TableBody>
                        </Table>
                    </TableContainer>
                </DndContext>
            ) : (
                <Typography variant="body2" color="text.secondary" sx={{mt: 1, fontStyle: 'italic'}}>
                    No prerequisites added yet.
                </Typography>
            )}
        </Box>
    );
};

export default PrerequisitesEditor;
