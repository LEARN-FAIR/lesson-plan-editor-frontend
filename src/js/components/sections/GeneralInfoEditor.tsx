import React from 'react';
import {
    Box,
    Checkbox,
    FormControl,
    FormControlLabel,
    FormGroup,
    FormLabel,
    MenuItem,
    TextField,
    Typography
} from '@mui/material';
import type {FairMarkdownDocument} from '../../types';
import MdxEditorComponent from '../common/MdxEditorComponent';
import SectionHeader from '../common/SectionHeader';
import InfoOutlineIcon from '@mui/icons-material/InfoOutline';

interface GeneralInfoEditorProps {
    document: FairMarkdownDocument;
    onChange: (updatedDocument: Partial<FairMarkdownDocument>) => void;
}

const GeneralInfoEditor: React.FC<GeneralInfoEditorProps> = ({document, onChange}) => {
    const handleChange = (field: keyof FairMarkdownDocument) => (event: React.ChangeEvent<HTMLInputElement>) => {
        // For all fields except layout, update normally
        if (field === 'layout') {
            // Always set layout to 'lesson-plan'
            onChange({layout: 'lesson-plan'});
        } else {
            onChange({[field]: event.target.value});
        }
    };

    const handleDescriptionChange = (value: string) => {
        onChange({description: value});
    };

    const handleFairElementChange = (element: 'F' | 'A' | 'I' | 'R') => (event: React.ChangeEvent<HTMLInputElement>) => {
        let updatedElements = [...document.fair_elements];

        if (event.target.checked) {
            if (!updatedElements.includes(element)) {
                updatedElements.push(element);
            }
        } else {
            updatedElements = updatedElements.filter(el => el !== element);
        }

        onChange({fair_elements: updatedElements});
    };

    return (
        <Box>
            <SectionHeader
                icon={<InfoOutlineIcon color="primary"/>}
                title="General information"
            />
            <TextField
                fullWidth
                margin="normal"
                label="Number"
                value={document.number || ''}
                onChange={handleChange('number')}
            />

            <TextField
                fullWidth
                margin="normal"
                label="Title"
                value={document.title || ''}
                onChange={handleChange('title')}
            />

            <TextField
                select
                fullWidth
                margin="normal"
                label="Status"
                value={document.status || ''}
                onChange={handleChange('status')}
            >
                <MenuItem value="draft">Draft</MenuItem>
                <MenuItem value="ready_for_review">Ready for Review</MenuItem>
                <MenuItem value="published">Published</MenuItem>
            </TextField>

            <Box sx={{mt: 2, mb: 2}}>
                <Typography variant="subtitle1" gutterBottom>
                    Description
                </Typography>
                <MdxEditorComponent
                    markdown={document.description || ''}
                    onChange={handleDescriptionChange}
                    minHeight="150px"
                    maxHeight="300px"
                    placeholder="Enter a description for this lesson plan..."
                    showToolbar={true}
                    showDiffToggle={false}
                />
            </Box>

            <FormControl component="fieldset" margin="normal">
                <FormLabel component="legend">FAIR Elements</FormLabel>
                <FormGroup row>
                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={document.fair_elements?.includes('F')}
                                onChange={handleFairElementChange('F')}
                            />
                        }
                        label="Findable"
                    />
                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={document.fair_elements?.includes('A')}
                                onChange={handleFairElementChange('A')}
                            />
                        }
                        label="Accessible"
                    />
                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={document.fair_elements?.includes('I')}
                                onChange={handleFairElementChange('I')}
                            />
                        }
                        label="Interoperable"
                    />
                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={document.fair_elements?.includes('R')}
                                onChange={handleFairElementChange('R')}
                            />
                        }
                        label="Reusable"
                    />
                </FormGroup>
            </FormControl>
        </Box>
    );
};

export default GeneralInfoEditor;
