import React, {ReactNode} from 'react';
import {AppBar, Container, styled, Toolbar} from '@mui/material';

interface StyledAppBarProps {
    children: ReactNode;
}

const StyledToolbar = styled(Toolbar)(({theme}) => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexShrink: 0,
    borderRadius: theme.shape.borderRadius,
    backdropFilter: 'blur(24px)',
    border: '1px solid',
    borderColor: (theme.vars || theme).palette.divider,
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.primary.contrastText,
    boxShadow: (theme.vars || theme).shadows[1],
    padding: '8px 12px',
}));


const StyledAppBar: React.FC<StyledAppBarProps> = ({children}) => {
    return (
        <AppBar
            enableColorOnDark
            position="relative"
            sx={{
                boxShadow: 0,
                bgcolor: 'transparent',
                backgroundImage: 'none',
                mt: 'calc(var(--template-frame-height, 0px) + 28px)',
            }}
        >
            <Container maxWidth="lg">
                <StyledToolbar variant="dense" disableGutters>
                    {children}
                </StyledToolbar>
            </Container>
        </AppBar>
    );
};

export default StyledAppBar;
