import React from 'react';
import {Alert, AlertTitle, Box, Paper, Typography} from '@mui/material';
import type {FairMarkdownDocument} from '../../types';
import SectionHeader from '../common/SectionHeader';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';

interface TermsEditorProps {
    document: FairMarkdownDocument;
    onChange: (updatedDocument: Partial<FairMarkdownDocument>) => void;
}

const TermsEditor: React.FC<TermsEditorProps> = ({document, onChange}) => {
    // This component is simplified since terms4FAIRskills section can be skipped
    // as confirmed by the user

    return (
        <Box>
            <Alert severity="info" sx={{mb: 3}}>
                <AlertTitle>Terms for FAIR Skills Section</AlertTitle>
                The terms4FAIRskills section has been omitted from the editor as confirmed.
                Any existing terms will be preserved in the document.
            </Alert>

            <Paper sx={{p: 3}}>
                <SectionHeader
                    icon={<LocalOfferIcon color="primary"/>}
                    title="Terms for FAIR Skills"
                />

                <Typography variant="body1">
                    {document.terms4FAIRskills && document.terms4FAIRskills.length > 0 ? (
                        <span>
              This document contains {document.terms4FAIRskills.length} term(s) structured as subject-predicate-object triples.
              These will be preserved when saving.
            </span>
                    ) : (
                        <span>No terms have been defined in this document.</span>
                    )}
                </Typography>
            </Paper>
        </Box>
    );
};

export default TermsEditor;
