import React, {useEffect, useState} from 'react';
import {
    Autocomplete,
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    TextField,
    Typography,
    Divider
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import type {Contributor} from '../../services/contributorService';
import type {AuthorData} from '../../types/authorTypes';
import customContributorService from '../../services/customContributorService';
import {useQueryClient} from '@tanstack/react-query';

interface ReviewerEditorModalProps {
    open: boolean;
    onClose: () => void;
    onSave: (reviewer: AuthorData) => void;
    contributors: Contributor[];
}

const ReviewerEditorModal: React.FC<ReviewerEditorModalProps> = ({
                                                                     open,
                                                                     onClose,
                                                                     onSave,
                                                                     contributors
                                                                 }) => {
    const queryClient = useQueryClient();
    const [reviewer, setReviewer] = useState<AuthorData>({
        id: '',
        name: '',
        orcid: ''
    });
    const [selectedContributor, setSelectedContributor] = useState<Contributor | null>(null);
    const [isAddingCustom, setIsAddingCustom] = useState<boolean>(false);
    const [customFirstName, setCustomFirstName] = useState<string>('');
    const [customLastName, setCustomLastName] = useState<string>('');
    const [customOrcid, setCustomOrcid] = useState<string>('');

    useEffect(() => {
        if (!open) {
            // Reset form when modal closes
            setReviewer({
                name: '',
                orcid: ''
            });
            setSelectedContributor(null);
            setIsAddingCustom(false);
            setCustomFirstName('');
            setCustomLastName('');
            setCustomOrcid('');
        }
    }, [open]);

    const handleContributorSelect = (contributor: Contributor | null) => {
        setSelectedContributor(contributor);
        if (contributor) {
            setReviewer({
                id: contributor.id,
                name: `${contributor.firstName} ${contributor.lastName}`,
                orcid: contributor.orcid || contributor.id
            });
        }
    };

    const handleSave = () => {
        if (isAddingCustom) {
            // Save custom contributor
            if (!customFirstName.trim() || !customLastName.trim()) {
                return; // Validation will show error
            }
            
            // Create custom contributor
            const contributorId = customOrcid.trim() || customContributorService.generateId(customFirstName, customLastName);
            const customContributor = customContributorService.addCustomContributor({
                id: contributorId,
                orcid: customOrcid.trim() || undefined,
                firstName: customFirstName.trim(),
                lastName: customLastName.trim()
            });
            
            // Invalidate contributors query to refetch with new custom contributor
            queryClient.invalidateQueries({queryKey: ['contributors']});
            
            // Save as reviewer
            onSave({
                id: customContributor.id,
                name: `${customContributor.firstName} ${customContributor.lastName}`,
                orcid: customContributor.orcid || customContributor.id
            });
            onClose();
        } else if (selectedContributor) {
            onSave({
                ...reviewer,
                name: reviewer.name.trim(),
                orcid: reviewer.orcid.trim()
            });
            onClose();
        }
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            fullWidth
            maxWidth="sm"
        >
            <DialogTitle>
                Add Reviewer
                <IconButton
                    aria-label="close"
                    onClick={onClose}
                    sx={{
                        position: 'absolute',
                        right: 8,
                        top: 8,
                    }}
                >
                    <CloseIcon/>
                </IconButton>
            </DialogTitle>
            <DialogContent>
                {!isAddingCustom ? (
                    <>
                        <Autocomplete
                            fullWidth
                            options={contributors}
                            getOptionLabel={(option) => `${option.firstName} ${option.lastName}` || ''}
                            value={selectedContributor}
                            onChange={(_, newValue) => handleContributorSelect(newValue)}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    margin="dense"
                                    label="Search Contributor"
                                    variant="outlined"
                                    autoFocus
                                />
                            )}
                            sx={{mb: 2}}
                        />

                        {selectedContributor && (
                            <>
                                <Box sx={{mb: 2}}>
                                    <TextField
                                        fullWidth
                                        margin="dense"
                                        label="Name"
                                        value={reviewer.name}
                                        disabled
                                        required
                                        variant="outlined"
                                    />
                                </Box>

                                <Box sx={{mb: 2}}>
                                    <TextField
                                        fullWidth
                                        margin="dense"
                                        label="ORCID"
                                        value={reviewer.orcid}
                                        disabled
                                        variant="outlined"
                                    />
                                </Box>
                            </>
                        )}

                        <Divider sx={{my: 2}} />

                        <Box sx={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1}}>
                            <Typography variant="body2" color="text.secondary">
                                Can't find the contributor?
                            </Typography>
                            <Button
                                startIcon={<PersonAddIcon />}
                                onClick={() => setIsAddingCustom(true)}
                                variant="contained"
                                color="primary"
                            >
                                Add new contributor manually
                            </Button>
                        </Box>
                    </>
                ) : (
                    <>
                        <Typography variant="body2" color="text.secondary" sx={{mb: 2}}>
                            Add a new contributor that is not in the list. This contributor will be saved and included in your commit.
                        </Typography>

                        <Box sx={{mb: 2}}>
                            <TextField
                                fullWidth
                                margin="dense"
                                label="First Name"
                                value={customFirstName}
                                onChange={(e) => setCustomFirstName(e.target.value)}
                                required
                                variant="outlined"
                                autoFocus
                                error={!customFirstName.trim()}
                                helperText={!customFirstName.trim() ? 'First name is required' : ''}
                            />
                        </Box>

                        <Box sx={{mb: 2}}>
                            <TextField
                                fullWidth
                                margin="dense"
                                label="Last Name"
                                value={customLastName}
                                onChange={(e) => setCustomLastName(e.target.value)}
                                required
                                variant="outlined"
                                error={!customLastName.trim()}
                                helperText={!customLastName.trim() ? 'Last name is required' : ''}  
                            />
                        </Box>

                        <Box sx={{mb: 2}}>
                            <TextField
                                fullWidth
                                margin="dense"
                                label="ORCID (optional)"
                                value={customOrcid}
                                onChange={(e) => setCustomOrcid(e.target.value)}
                                variant="outlined"
                                placeholder="0000-0000-0000-0000"
                                helperText="ORCID identifier (optional)"
                            />
                        </Box>

                        <Box sx={{display: 'flex', justifyContent: 'center', mt: 2}}>
                            <Button
                                onClick={() => {
                                    setIsAddingCustom(false);
                                    setCustomFirstName('');
                                    setCustomLastName('');
                                    setCustomOrcid('');
                                }}
                                variant="outlined"
                            >
                                Back to search
                            </Button>
                        </Box>
                    </>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button
                    onClick={handleSave}
                    variant="contained"
                    color="primary"
                    disabled={isAddingCustom ? (!customFirstName.trim() || !customLastName.trim()) : !selectedContributor}
                >
                    Add
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default ReviewerEditorModal;
