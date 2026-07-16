import React, {useState} from 'react';
import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Tooltip,
    Typography
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import type {FairMarkdownDocument, Resource} from '../../types';
import AddIcon from '@mui/icons-material/Add';
import SectionHeader from '../common/SectionHeader';
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
import AttachmentIcon from '@mui/icons-material/Attachment';

interface ResourcesEditorProps {
    document: FairMarkdownDocument;
    onChange: (updatedDocument: Partial<FairMarkdownDocument>) => void;
}

interface ResourceFormData {
    title: string;
    author?: string;
    url: string;
    doi?: string;
    additionalInformation?: string;
}

const ResourcesEditor: React.FC<ResourcesEditorProps> = ({document, onChange}) => {
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [formData, setFormData] = useState<ResourceFormData>({
        title: '',
        author: '',
        url: '',
        doi: '',
        additionalInformation: ''
    });

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
            const oldIndex = parseInt(active.id.toString());
            const newIndex = parseInt(over.id.toString());

            // First update with the original items but in new order
            // This allows the animation to complete properly
            const reorderedResources = arrayMove(
                [...(document.additionalResources || [])],
                oldIndex,
                newIndex
            );

            onChange({additionalResources: reorderedResources});
        }
    };

    // Function to shorten URLs and DOIs for display
    const shortenText = (text: string, maxLength: number = 40): string => {
        if (!text || text.length <= maxLength) return text;

        // For URLs, try to show the domain and part of the path
        try {
            const url = new URL(text);
            const domain = url.hostname;
            const path = url.pathname;

            if (domain.length + 10 >= maxLength) {
                // If domain itself is too long
                return domain.substring(0, maxLength - 3) + '...';
            } else {
                // Show domain and part of the path
                const remainingChars = maxLength - domain.length - 5;
                const shortenedPath = path.length > remainingChars
                    ? path.substring(0, remainingChars) + '...'
                    : path;
                return `${domain}${shortenedPath}`;
            }
        } catch (e) {
            // Not a valid URL, just truncate
            return text.substring(0, maxLength - 3) + '...';
        }
    };

    const handleOpenDialog = (index?: number) => {
        if (index !== undefined) {
            // Editing existing resource
            setEditingIndex(index);
            const resource = document.additionalResources[index];
            setFormData({
                title: resource.title || '',
                author: resource.author || '',
                url: resource.url || '',
                doi: resource.doi || '',
                additionalInformation: resource.additionalInformation || ''
            });
        } else {
            // Adding new resource
            setEditingIndex(null);
            setFormData({
                title: '',
                author: '',
                url: '',
                doi: '',
                additionalInformation: ''
            });
        }
        setDialogOpen(true);
    };

    const handleCloseDialog = () => {
        setDialogOpen(false);
    };

    const handleFormChange = (field: keyof ResourceFormData) => (event: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({
            ...formData,
            [field]: event.target.value
        });
    };

    const handleSaveResource = () => {
        // Validate required fields
        if (!formData.title || (!formData.url && !formData.doi)) {
            return;
        }

        const newResource: Resource = {
            title: formData.title,
            ...(formData.url && {url: formData.url}),
            ...(formData.author && {author: formData.author}),
            ...(formData.doi && {doi: formData.doi}),
            ...(formData.additionalInformation && {additionalInformation: formData.additionalInformation})
        };

        let updatedResources = [...(document.additionalResources || [])];

        if (editingIndex !== null) {
            // Update existing
            updatedResources[editingIndex] = newResource;
        } else {
            // Add new
            updatedResources.push(newResource);
        }

        onChange({additionalResources: updatedResources});
        handleCloseDialog();
    };

    const handleRemoveResource = (index: number) => {
        const updatedResources = [...document.additionalResources];
        updatedResources.splice(index, 1);
        onChange({additionalResources: updatedResources});
    };

    return (
        <Box>
            <SectionHeader
                title="Additional resources"
                icon={<AttachmentIcon color="primary"/>}
                actions={
                    <Button
                        startIcon={<AddIcon/>}
                        variant="contained"
                        onClick={() => handleOpenDialog()}
                    >
                        Add resource
                    </Button>
                }
            />

            {(!document.additionalResources || document.additionalResources.length === 0) ? (
                <Typography variant="body2" sx={{fontStyle: 'italic', my: 2}}>
                    No resources have been added yet.
                </Typography>
            ) : (
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                >
                    <TableContainer component={Box} sx={{width: '100%'}}>
                        <Table sx={{width: '100%'}} aria-label="resources table">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Title</TableCell>
                                    <TableCell width="280px">Author</TableCell>
                                    <TableCell width="280px">URL/DOI</TableCell>
                                    <TableCell width="120px"></TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                <SortableContext
                                    items={document.additionalResources?.map((_, index) => `${index}`) || []}
                                    strategy={verticalListSortingStrategy}
                                >
                                    {document.additionalResources?.map((resource, index) => (
                                        <SortableRowWithActions 
                                            key={index} 
                                            id={`${index}`}
                                            actions={
                                                <>
                                                    <IconButton
                                                        size="small"
                                                        color="primary"
                                                        onClick={() => handleOpenDialog(index)}
                                                        className="action-item"
                                                        sx={{ visibility: 'hidden', mr: 1 }}
                                                    >
                                                        <EditIcon fontSize="small"/>
                                                    </IconButton>
                                                    <IconButton
                                                        size="small"
                                                        color="error"
                                                        onClick={() => handleRemoveResource(index)}
                                                        className="action-item"
                                                        sx={{ visibility: 'hidden', mr: 1 }}
                                                    >
                                                        <DeleteIcon fontSize="small"/>
                                                    </IconButton>
                                                </>
                                            }
                                        >
                                            <TableCell>{resource.title}</TableCell>
                                            <TableCell>{resource.author || '-'}</TableCell>
                                            <TableCell sx={{overflow: 'hidden'}}>
                                                {resource.url && (
                                                    <Tooltip title={resource.url} placement="top">
                                                        <Box component="span" sx={{
                                                            display: 'block',
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis'
                                                        }}>
                                                            {shortenText(resource.url, 30)}
                                                        </Box>
                                                    </Tooltip>
                                                )}
                                                {resource.doi && (
                                                    <Tooltip title={`DOI: ${resource.doi}`} placement="top">
                                                        <Box component="span" sx={{
                                                            display: 'block',
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis'
                                                        }}>
                                                            {resource.doi.startsWith('DOI: ') ? shortenText(resource.doi, 30) : shortenText(`DOI: ${resource.doi}`, 30)}
                                                        </Box>
                                                    </Tooltip>
                                                )}
                                                {!resource.url && !resource.doi && (
                                                    <Box component="span"
                                                         sx={{fontStyle: 'italic', color: 'text.secondary'}}>-</Box>
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

            {/* Resource Form Dialog */}
            <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
                <DialogTitle>
                    {editingIndex !== null ? 'Edit Resource' : 'Add New Resource'}
                </DialogTitle>
                <DialogContent>
                    <TextField
                        fullWidth
                        margin="normal"
                        label="Title"
                        required
                        value={formData.title}
                        onChange={handleFormChange('title')}
                        autoFocus
                    />
                    <TextField
                        fullWidth
                        margin="normal"
                        label="Author (optional)"
                        value={formData.author || ''}
                        onChange={handleFormChange('author')}
                    />
                    <TextField
                        fullWidth
                        margin="normal"
                        label="URL"
                        required={!formData.doi}
                        value={formData.url || ''}
                        onChange={handleFormChange('url')}
                        helperText="Either URL or DOI is required"
                    />
                    <TextField
                        fullWidth
                        margin="normal"
                        label="DOI"
                        required={!formData.url}
                        value={formData.doi || ''}
                        onChange={handleFormChange('doi')}
                        helperText="Either URL or DOI is required"
                    />
                    <TextField
                        fullWidth
                        margin="normal"
                        multiline
                        rows={2}
                        label="Additional Information (optional)"
                        value={formData.additionalInformation || ''}
                        onChange={handleFormChange('additionalInformation')}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog}>Cancel</Button>
                    <Button onClick={handleSaveResource} variant="contained">
                        Save
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default ResourcesEditor;
