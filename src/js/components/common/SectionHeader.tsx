import React, {ReactNode} from 'react';
import {Box, Typography} from '@mui/material';

interface SectionHeaderProps {
    icon?: ReactNode;
    title: string;
    actions?: ReactNode;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({icon, title, actions}) => {
    return (
        <Box sx={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2}}>
            <Box sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: '#e9ecef',
                px: 1,
                py: 0.5,
                borderRadius: 2
            }}>
                {icon}
                <Typography sx={{ml: 0.5}} variant="h6">{title}</Typography>
            </Box>
            {actions}
        </Box>
    );
};

export default SectionHeader;
