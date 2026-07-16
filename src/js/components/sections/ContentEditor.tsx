import React from 'react';
import {Box} from '@mui/material';
import type {FairMarkdownDocument} from '../../types';
import MdxEditorComponent from '../common/MdxEditorComponent';
import SectionHeader from '../common/SectionHeader';
import SubjectIcon from '@mui/icons-material/Subject';

interface ContentEditorProps {
    document: FairMarkdownDocument;
    onChange: (updatedDocument: Partial<FairMarkdownDocument>) => void;
}

const ContentEditor: React.FC<ContentEditorProps> = ({document, onChange}) => {
    const handleContentChange = (value: string | undefined) => {
        if (value !== undefined) {
            onChange({content: value});
        }
    };

    return (
        <Box>
            <SectionHeader
                icon={<SubjectIcon color="primary"/>}
                title="Content"
            />

            <Box sx={{minHeight: '500px'}}>
                <MdxEditorComponent
                    markdown={document.content || ''}
                    onChange={handleContentChange}
                    minHeight="500px"
                    maxHeight="800px"
                    showToolbar={true}
                    showDiffToggle={true}
                    placeholder="Write your markdown content here..."
                />
            </Box>
        </Box>
    );
};

export default ContentEditor;
