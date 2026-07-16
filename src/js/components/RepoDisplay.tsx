import React, {useEffect, useState} from 'react';
import {Avatar, Box, Button, Chip, Paper, Tooltip, Typography} from '@mui/material';
import ForkRightIcon from '@mui/icons-material/ForkRight';
import GitHubIcon from '@mui/icons-material/GitHub';
import githubRepoService, {Repository} from '../services/githubRepoService';

interface RepoDisplayProps {
    onSelectRepo: () => void;
}

const RepoDisplay: React.FC<RepoDisplayProps> = ({onSelectRepo}) => {
    const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null);

    useEffect(() => {
        // Load the selected repository from the service
        const repo = githubRepoService.getSelectedRepo();
        setSelectedRepo(repo);
    }, []);

    if (!selectedRepo) {
        return (
            <Paper
                elevation={1}
                sx={{
                    p: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    mb: 3
                }}
            >
                <Box sx={{display: 'flex', alignItems: 'center'}}>
                    <GitHubIcon sx={{mr: 1, color: 'text.secondary'}}/>
                    <Typography variant="body1">
                        No GitHub repository selected
                    </Typography>
                </Box>
                <Button
                    variant="contained"
                    color="primary"
                    size="small"
                    onClick={onSelectRepo}
                >
                    Select Repository
                </Button>
            </Paper>
        );
    }

    return (
        <Paper
            elevation={1}
            sx={{
                p: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                mb: 3
            }}
        >
            <Box sx={{display: 'flex', alignItems: 'center'}}>
                <Avatar
                    src={selectedRepo.owner.avatar_url}
                    alt={selectedRepo.owner.login}
                    sx={{width: 32, height: 32, mr: 2}}
                />
                <Box>
                    <Box sx={{display: 'flex', alignItems: 'center'}}>
                        <Typography variant="body1" sx={{fontWeight: 'medium'}}>
                            {selectedRepo.full_name}
                        </Typography>
                        {selectedRepo.fork && (
                            <Tooltip title="This is a fork">
                                <ForkRightIcon fontSize="small" sx={{ml: 1, color: 'text.secondary'}}/>
                            </Tooltip>
                        )}
                    </Box>
                    <Box sx={{mt: 0.5}}>
                        {selectedRepo.permissions?.push ? (
                            <Chip label="Write Access" size="small" color="success" variant="outlined"/>
                        ) : (
                            <Chip label="Read Only" size="small" color="warning" variant="outlined"/>
                        )}
                    </Box>
                </Box>
            </Box>
            <Box>
                <Button
                    variant="outlined"
                    color="primary"
                    size="small"
                    onClick={onSelectRepo}
                    sx={{mr: 1}}
                >
                    Change
                </Button>
                <Button
                    variant="outlined"
                    size="small"
                    href={selectedRepo.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    startIcon={<GitHubIcon/>}
                >
                    View
                </Button>
            </Box>
        </Paper>
    );
};

export default RepoDisplay;
