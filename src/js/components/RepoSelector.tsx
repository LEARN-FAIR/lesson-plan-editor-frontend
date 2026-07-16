import React, {useEffect, useState} from 'react';
import logger from '../utils/logger';
import {
    Alert,
    Avatar,
    Box,
    Button,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    List,
    ListItem,
    ListItemAvatar,
    ListItemButton,
    ListItemText,
    Tooltip,
    Typography
} from '@mui/material';
import ForkRightIcon from '@mui/icons-material/ForkRight';
import githubRepoService, {Repository} from '../services/githubRepoService';

interface RepoSelectorProps {
    open: boolean;
    onClose: () => void;
    onRepoSelected: (repo: Repository) => void;
}

const RepoSelector: React.FC<RepoSelectorProps> = ({open, onClose, onRepoSelected}) => {
    const [repositories, setRepositories] = useState<Repository[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [creatingFork, setCreatingFork] = useState<boolean>(false);

    useEffect(() => {
        if (open) {
            fetchRepositories();
        }
    }, [open]);

    const fetchRepositories = async () => {
        try {
            setLoading(true);
            setError(null);
            const repos = await githubRepoService.getTargetRepoAndForks();
            setRepositories(repos);
        } catch (err) {
            logger.error('Error fetching repositories:', err);
            setError(err instanceof Error ? err.message : 'Failed to load repositories');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateFork = () => {
        // Open GitHub fork page in a new tab
        window.open('https://github.com/elixir-europe-training/ELIXIR-TrP-FAIR-Converge/fork', '_blank');

        // Show a message to the user about refreshing after forking
        setError('After creating your fork on GitHub, please refresh this page to see your new fork.');
    };

    const handleSelectRepo = (repo: Repository) => {
        githubRepoService.setSelectedRepo(repo);
        onRepoSelected(repo);
        onClose();
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>Select GitHub Repository</DialogTitle>
            <DialogContent>
                <DialogContentText>
                    Please select the ELIXIR-TrP-FAIR-Converge repository or one of your forks.
                    You need write access to the repository to save changes.
                </DialogContentText>

                {error && (
                    <Alert severity="error" sx={{mt: 2, mb: 2}}>
                        {error}
                    </Alert>
                )}

                {loading ? (
                    <Box sx={{display: 'flex', justifyContent: 'center', my: 4}}>
                        <CircularProgress/>
                    </Box>
                ) : repositories.length === 0 ? (
                    <Box sx={{my: 3}}>
                        <Typography variant="body1" gutterBottom>
                            You don't have access to the original repository or any forks.
                        </Typography>
                        <Button
                            variant="contained"
                            color="primary"
                            onClick={handleCreateFork}
                            startIcon={<ForkRightIcon/>}
                            sx={{mt: 2}}
                        >
                            Fork on GitHub
                        </Button>
                    </Box>
                ) : (
                    <List sx={{width: '100%', bgcolor: 'background.paper'}}>
                        {repositories.map((repo) => (
                            <ListItem key={repo.id} disablePadding>
                                <ListItemButton onClick={() => handleSelectRepo(repo)}>
                                    <ListItemAvatar>
                                        <Avatar src={repo.owner.avatar_url} alt={repo.owner.login}/>
                                    </ListItemAvatar>
                                    <ListItemText
                                        primary={
                                            <Box sx={{display: 'flex', alignItems: 'center'}}>
                                                {repo.full_name}
                                                {repo.fork && (
                                                    <Tooltip title="This is a fork">
                                                        <ForkRightIcon fontSize="small"
                                                                       sx={{ml: 1, color: 'text.secondary'}}/>
                                                    </Tooltip>
                                                )}
                                            </Box>
                                        }
                                        secondary={
                                            <Box sx={{display: 'flex', alignItems: 'center', mt: 0.5}}>
                                                {repo.permissions?.push ? (
                                                    <Chip label="Write Access" size="small" color="success"
                                                          variant="outlined"/>
                                                ) : (
                                                    <Chip label="Read Only" size="small" color="warning"
                                                          variant="outlined"/>
                                                )}
                                            </Box>
                                        }
                                    />
                                </ListItemButton>
                            </ListItem>
                        ))}
                    </List>
                )}

                {repositories.length > 0 && (
                    <Box sx={{mt: 2}}>
                        <Button
                            variant="outlined"
                            color="primary"
                            onClick={handleCreateFork}
                            startIcon={<ForkRightIcon/>}
                        >
                            Fork on GitHub
                        </Button>
                        <Typography variant="caption" display="block" sx={{mt: 1}}>
                            After creating your fork, refresh this page to see it in the list.
                        </Typography>
                    </Box>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
            </DialogActions>
        </Dialog>
    );
};

export default RepoSelector;
