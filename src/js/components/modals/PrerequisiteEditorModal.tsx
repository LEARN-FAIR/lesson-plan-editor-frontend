import React, {useEffect, useState} from 'react';
import {Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, TextField} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

interface PrerequisiteEditorModalProps {
    open: boolean;
    onClose: () => void;
    onSave: (prerequisite: string) => void;
    initialValue?: string;
    isEditing?: boolean;
}

const PrerequisiteEditorModal: React.FC<PrerequisiteEditorModalProps> = ({
                                                                             open,
                                                                             onClose,
                                                                             onSave,
                                                                             initialValue = '',
                                                                             isEditing = false
                                                                         }) => {
    const [prerequisite, setPrerequisite] = useState(initialValue);

    useEffect(() => {
        if (open) {
            setPrerequisite(initialValue);
        }
    }, [open, initialValue]);

    const handleSave = () => {
        if (prerequisite.trim()) {
            onSave(prerequisite.trim());
            onClose();
        }
    };

    const handleKeyPress = (event: React.KeyboardEvent) => {
        if (event.key === 'Enter') {
            handleSave();
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
                {isEditing ? 'Edit Prerequisite' : 'Add Prerequisite'}
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
                <TextField
                    autoFocus
                    margin="dense"
                    label="Prerequisite"
                    fullWidth
                    value={prerequisite}
                    onChange={(e) => setPrerequisite(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="e.g., Basic knowledge of research data management"
                    variant="outlined"
                    sx={{mt: 1}}
                />
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button onClick={handleSave} variant="contained" color="primary">
                    {isEditing ? 'Update' : 'Add'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default PrerequisiteEditorModal;
