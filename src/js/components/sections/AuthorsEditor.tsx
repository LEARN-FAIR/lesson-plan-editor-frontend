import React, {useState} from 'react';
import {
    Box,
    Button,
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
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import AddIcon from '@mui/icons-material/Add';
import PeopleIcon from '@mui/icons-material/People';
import RateReviewIcon from '@mui/icons-material/RateReview';
import SectionHeader from '../common/SectionHeader';
import AuthorEditorModal from '../modals/AuthorEditorModal';
import ReviewerEditorModal from '../modals/ReviewerEditorModal';
import type {FairMarkdownDocument} from '../../types';
import type {Contributor} from '../../services/contributorService';
import {useContributors} from '../../services/contributorQueryHooks';
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
import type {AuthorData} from '../../types/authorTypes';

interface AuthorsEditorProps {
    document: FairMarkdownDocument;
    onChange: (updatedDocument: Partial<FairMarkdownDocument>) => void;
    owner?: string;
    repo?: string;
    branch?: string;
}

const AuthorsEditor: React.FC<AuthorsEditorProps> = ({document, onChange, owner, repo, branch}) => {
    const [authorModalOpen, setAuthorModalOpen] = useState(false);
    const [reviewerModalOpen, setReviewerModalOpen] = useState(false);
    const [newAuthor, setNewAuthor] = useState('');
    const [newReviewer, setNewReviewer] = useState('');
    // Use React Query to fetch contributors
    const {data: contributors = [], isLoading: loading} = useContributors(owner, repo, branch);
    const [selectedAuthor, setSelectedAuthor] = useState<Contributor | null>(null);
    const [selectedReviewer, setSelectedReviewer] = useState<Contributor | null>(null);

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

    // Handle drag end event for authors
    const handleAuthorsDragEnd = (event: DragEndEvent) => {
        const {active, over} = event;

        if (over && active.id !== over.id) {
            const oldIndex = parseInt(active.id.toString(), 10);
            const newIndex = parseInt(over.id.toString(), 10);

            // Create a new array with the reordered items
            // This allows the animation to complete properly
            const updatedAuthors = arrayMove(
                [...(document.authors || [])],
                oldIndex,
                newIndex
            );

            onChange({authors: updatedAuthors});
        }
    };

    // Handle drag end event for reviewers
    const handleReviewersDragEnd = (event: DragEndEvent) => {
        const {active, over} = event;

        if (over && active.id !== over.id) {
            const oldIndex = parseInt(active.id.toString(), 10);
            const newIndex = parseInt(over.id.toString(), 10);

            // Create a new array with the reordered items
            // This allows the animation to complete properly
            const updatedReviewers = arrayMove(
                [...(document.reviewers || [])],
                oldIndex,
                newIndex
            );

            onChange({reviewers: updatedReviewers});
        }
    };

    // No need for useEffect to fetch contributors - React Query handles it

    const handleAddAuthor = () => {
        if (selectedAuthor) {
            // If an author was selected from the dropdown
            const authorId = selectedAuthor.id;
            if (!document.authors?.includes(authorId)) {
                const updatedAuthors = [...(document.authors || []), authorId];
                onChange({authors: updatedAuthors});
            }
            setSelectedAuthor(null);
        } else if (newAuthor.trim()) {
            // If manual text was entered
            const updatedAuthors = [...(document.authors || []), newAuthor.trim()];
            onChange({authors: updatedAuthors});
            setNewAuthor('');
        }
    };

    const handleRemoveAuthor = (index: number) => {
        const updatedAuthors = [...document.authors];
        updatedAuthors.splice(index, 1);
        onChange({authors: updatedAuthors});
    };

    const handleAddReviewer = () => {
        if (selectedReviewer) {
            // If a reviewer was selected from the dropdown
            const reviewerId = selectedReviewer.id;
            if (!document.reviewers?.includes(reviewerId)) {
                const updatedReviewers = [...(document.reviewers || []), reviewerId];
                onChange({reviewers: updatedReviewers});
            }
            setSelectedReviewer(null);
        } else if (newReviewer.trim()) {
            // If manual text was entered
            const updatedReviewers = [...(document.reviewers || []), newReviewer.trim()];
            onChange({reviewers: updatedReviewers});
            setNewReviewer('');
        }
    };

    const handleRemoveReviewer = (index: number) => {
        const updatedReviewers = [...document.reviewers];
        updatedReviewers.splice(index, 1);
        onChange({reviewers: updatedReviewers});
    };

    const handleSaveAuthor = (author: AuthorData) => {
        const updatedAuthors = [...(document.authors || [])];
        // Use the contributor ID
        updatedAuthors.push(author.id);

        onChange({authors: updatedAuthors});
    };

    const handleSaveReviewer = (reviewer: AuthorData) => {
        const updatedReviewers = [...(document.reviewers || [])];
        // Use the contributor ID
        updatedReviewers.push(reviewer.id);

        onChange({reviewers: updatedReviewers});
        setReviewerModalOpen(false);
        setSelectedReviewer(null);
        setNewReviewer('');
    };

    const handleOpenAuthorModal = () => {
        setAuthorModalOpen(true);
    };

    const handleCloseAuthorModal = () => {
        setAuthorModalOpen(false);
    };

    const handleOpenReviewerModal = () => {
        setReviewerModalOpen(true);
    };

    const handleCloseReviewerModal = () => {
        setReviewerModalOpen(false);
    };

    return (
        <Box>
            <Box sx={{mb: 3}}>
                <SectionHeader
                    icon={<PeopleIcon color="primary"/>}
                    title="Authors"
                    actions={
                        <Button
                            variant="contained"
                            startIcon={<AddIcon/>}
                            onClick={handleOpenAuthorModal}
                        >
                            Add author
                        </Button>
                    }
                />

                <AuthorEditorModal
                    open={authorModalOpen}
                    onClose={handleCloseAuthorModal}
                    onSave={handleSaveAuthor}
                    contributors={contributors}
                />

                {document.authors && document.authors.length > 0 ? (
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleAuthorsDragEnd}
                    >
                        <TableContainer component={Box} sx={{width: '100%', mb: 2}}>
                            <Table sx={{width: '100%'}} aria-label="authors table">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Name</TableCell>
                                        <TableCell width="400px">ORCID</TableCell>
                                        <TableCell width="120px"></TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    <SortableContext
                                        items={document.authors.map((_, index) => index.toString())}
                                        strategy={verticalListSortingStrategy}
                                    >
                                        {document.authors.map((authorId, index) => {
                                            // Try to find the contributor by ID
                                            const contributor = contributors.find(c => c.id === authorId);

                                            // Extract name and ORCID
                                            let name = authorId;
                                            let orcid = '';

                                            if (contributor) {
                                                name = `${contributor.firstName} ${contributor.lastName}`;
                                                orcid = contributor.orcid || contributor.id || '';
                                            } else if (authorId.startsWith('0000-')) {
                                                // If it's an ORCID format but not found in contributors
                                                orcid = authorId;
                                            }

                                            return (
                                                <SortableRowWithActions 
                                                    key={index} 
                                                    id={index.toString()}
                                                    actions={
                                                        <IconButton
                                                            size="small"
                                                            color="error"
                                                            onClick={() => handleRemoveAuthor(index)}
                                                            className="action-item"
                                                            sx={{ visibility: 'hidden', mr: 1 }}
                                                        >
                                                            <DeleteIcon fontSize="small"/>
                                                        </IconButton>
                                                    }
                                                >
                                                    <TableCell>{name}</TableCell>
                                                    <TableCell>
                                                        {orcid && orcid}
                                                    </TableCell>
                                                </SortableRowWithActions>
                                            );
                                        })}
                                    </SortableContext>
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </DndContext>
                ) : (
                    <Typography variant="body2" color="text.secondary" sx={{mt: 1, mb: 2, fontStyle: 'italic'}}>
                        No authors added yet.
                    </Typography>
                )}
            </Box>

            <Box sx={{mt: 4}}>
                <SectionHeader
                    icon={<RateReviewIcon color="primary"/>}
                    title="Reviewers"
                    actions={
                        <Button
                            variant="contained"
                            startIcon={<AddIcon/>}
                            onClick={handleOpenReviewerModal}
                        >
                            Add reviewer
                        </Button>
                    }
                />

                <ReviewerEditorModal
                    open={reviewerModalOpen}
                    onClose={handleCloseReviewerModal}
                    onSave={handleSaveReviewer}
                    contributors={contributors}
                />

                {document.reviewers && document.reviewers.length > 0 ? (
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleReviewersDragEnd}
                    >
                        <TableContainer component={Box} sx={{width: '100%', mb: 2}}>
                            <Table sx={{width: '100%'}} aria-label="reviewers table">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Name</TableCell>
                                        <TableCell width="400px">ORCID</TableCell>
                                        <TableCell width="120px"></TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    <SortableContext
                                        items={document.reviewers.map((_, index) => index.toString())}
                                        strategy={verticalListSortingStrategy}
                                    >
                                        {document.reviewers.map((reviewerId, index) => {
                                            // Try to find the contributor by ID
                                            const contributor = contributors.find(c => c.id === reviewerId);

                                            // Extract name and ORCID
                                            let name = reviewerId;
                                            let orcid = '';

                                            if (contributor) {
                                                name = `${contributor.firstName} ${contributor.lastName}`;
                                                orcid = contributor.id || '';
                                            } else if (reviewerId.startsWith('0000-')) {
                                                // If it's an ORCID format but not found in contributors
                                                orcid = reviewerId;
                                            }

                                            return (
                                                <SortableRowWithActions 
                                                    key={index} 
                                                    id={index.toString()}
                                                    actions={
                                                        <IconButton
                                                            size="small"
                                                            color="error"
                                                            onClick={() => handleRemoveReviewer(index)}
                                                            className="action-item"
                                                            sx={{ visibility: 'hidden', mr: 1 }}
                                                        >
                                                            <DeleteIcon fontSize="small"/>
                                                        </IconButton>
                                                    }
                                                >
                                                    <TableCell>{name}</TableCell>
                                                    <TableCell>
                                                        {orcid && orcid}
                                                    </TableCell>
                                                </SortableRowWithActions>
                                            );
                                        })}
                                    </SortableContext>
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </DndContext>
                ) : (
                    <Typography variant="body2" color="text.secondary" sx={{mt: 1, mb: 2, fontStyle: 'italic'}}>
                        No reviewers added yet.
                    </Typography>
                )}
            </Box>
        </Box>
    );
};

export default AuthorsEditor;
