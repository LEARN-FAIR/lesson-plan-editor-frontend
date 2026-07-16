import React, {useEffect, useState} from 'react';
import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    TextField,
    Typography
} from '@mui/material';
import type {LearningOutcome, LearningVerbLevel} from '../../types';

// Define a type for the level strings
type LevelString = 'beginner' | 'intermediate' | 'expert';

interface LevelVerbs {
    beginner: string;
    intermediate: string;
    expert: string;
}

interface LearningOutcomeEditorModalProps {
    open: boolean;
    onClose: () => void;
    onSave: (outcome: LearningOutcome, outcomeKey: string) => void;
    outcome?: LearningOutcome;
    outcomeKey?: string;
    mode: 'add' | 'edit';
}

const LearningOutcomeEditorModal: React.FC<LearningOutcomeEditorModalProps> = ({
                                                                                   open,
                                                                                   onClose,
                                                                                   onSave,
                                                                                   outcome,
                                                                                   outcomeKey,
                                                                                   mode
                                                                               }) => {
    const [outcomeText, setOutcomeText] = useState('');
    const [levelVerbs, setLevelVerbs] = useState<LevelVerbs>({
        beginner: '',
        intermediate: '',
        expert: ''
    });

    // Initialize form when outcome changes
    useEffect(() => {
        if (outcome) {
            setOutcomeText(outcome?.outcome || '');

            // Initialize verb inputs based on existing verbs
            const verbInputs: LevelVerbs = {
                beginner: '',
                intermediate: '',
                expert: ''
            };

            // Add null check for verbs array
            if (outcome.verbs && Array.isArray(outcome.verbs)) {
                outcome.verbs.forEach((verbObj: LearningVerbLevel) => {
                    if (verbObj.level === 'beginner' || verbObj.level === 'intermediate' || verbObj.level === 'expert') {
                        verbInputs[verbObj.level] = verbObj.verb || '';
                    }
                });
            }

            setLevelVerbs(verbInputs);
        } else {
            // Reset form for new outcome
            setOutcomeText('');
            setLevelVerbs({
                beginner: '',
                intermediate: '',
                expert: ''
            });
        }
    }, [outcome, open]);

    // Handle verb input changes
    const handleVerbChange = (level: LevelString, verb: string) => {
        setLevelVerbs(prev => ({
            ...prev,
            [level]: verb
        }));
    };

    const handleSave = () => {
        if (!outcomeText.trim()) return;

        // Create verbs array based on non-empty verb inputs
        const verbs = Object.entries(levelVerbs)
            .filter(([_, verb]) => verb.trim())
            .map(([level, verb]) => {
                const typedLevel = level as LevelString;
                return {
                    verb: verb.trim(),
                    level: typedLevel
                };
            });

        const updatedOutcome: LearningOutcome = {
            outcome: outcomeText,
            verbs: verbs
        };

        onSave(updatedOutcome, outcomeKey || '');
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>
                {mode === 'add' ? 'Add Learning Outcome' : 'Edit Learning Outcome'}
            </DialogTitle>
            <DialogContent>
                <Box sx={{mt: 2}}>
                    <TextField
                        fullWidth
                        label="Learning Outcome"
                        value={outcomeText}
                        onChange={(e) => setOutcomeText(e.target.value)}
                        placeholder="Enter learning outcome description"
                        multiline
                        rows={3}
                        autoFocus
                    />
                </Box>

                <Typography variant="subtitle1" sx={{mt: 3, mb: 1}}>
                    Bloom's Taxonomy Verbs
                </Typography>
                <Divider sx={{mb: 2}}/>

                <Box sx={{display: 'flex', flexDirection: {xs: 'column', md: 'row'}, gap: 2}}>
                    {/* Beginner Level */}
                    <Box sx={{flex: 1, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1}}>
                        <Typography variant="subtitle2" sx={{mb: 1, fontWeight: 'bold', color: 'primary.main'}}>
                            Beginner Level
                        </Typography>
                        <TextField
                            fullWidth
                            size="small"
                            label="Beginner verb"
                            value={levelVerbs.beginner}
                            onChange={(e) => handleVerbChange('beginner', e.target.value)}
                            placeholder="e.g., Identify, List, Describe"
                            margin="dense"
                        />
                    </Box>

                    {/* Intermediate Level */}
                    <Box sx={{flex: 1, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1}}>
                        <Typography variant="subtitle2" sx={{mb: 1, fontWeight: 'bold', color: 'secondary.main'}}>
                            Intermediate Level
                        </Typography>
                        <TextField
                            fullWidth
                            size="small"
                            label="Intermediate verb"
                            value={levelVerbs.intermediate}
                            onChange={(e) => handleVerbChange('intermediate', e.target.value)}
                            placeholder="e.g., Apply, Analyze, Compare"
                            margin="dense"
                        />
                    </Box>

                    {/* Expert Level */}
                    <Box sx={{flex: 1, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1}}>
                        <Typography variant="subtitle2" sx={{mb: 1, fontWeight: 'bold', color: 'error.main'}}>
                            Expert Level
                        </Typography>
                        <TextField
                            fullWidth
                            size="small"
                            label="Expert verb"
                            value={levelVerbs.expert}
                            onChange={(e) => handleVerbChange('expert', e.target.value)}
                            placeholder="e.g., Evaluate, Create, Design"
                            margin="dense"
                        />
                    </Box>
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button
                    onClick={handleSave}
                    variant="contained"
                    disabled={!outcomeText.trim()}
                >
                    {mode === 'add' ? 'Add' : 'Save'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default LearningOutcomeEditorModal;
