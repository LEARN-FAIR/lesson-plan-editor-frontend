import React, {useEffect, useState} from 'react';
import logger from '../utils/logger';
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    Divider,
    InputAdornment,
    List,
    ListItem,
    ListItemButton,
    ListItemText,
    TextField,
    Typography
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import DescriptionIcon from '@mui/icons-material/Description';
import AddIcon from '@mui/icons-material/Add';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import lessonPlanService from '../services/lessonPlanService';
import type {LessonPlan} from '../types/lessonPlan';
import githubRepoService from '../services/githubRepoService';
import {useLessonPlans} from '../services/lessonPlanQueryHooks';

interface LessonPlanSelectorProps {
    open: boolean;
    onClose: () => void;
    onLessonPlanSelected: (lessonPlan: LessonPlan) => void;
}

const LessonPlanSelector: React.FC<LessonPlanSelectorProps> = ({open, onClose, onLessonPlanSelected}) => {
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [creatingNew, setCreatingNew] = useState<boolean>(false);

    // Use React Query hook to fetch lesson plans
    const {data: lessonPlans = [], isLoading: loading, error: queryError} = useLessonPlans();

    // Format error message
    const errorMessage = queryError ? queryError.message : null;

    // Check if repository is selected
    const hasRepo = githubRepoService.hasSelectedRepo();
    const repoError = !hasRepo ? 'No repository selected. Please select a repository first.' : null;

    // Combined error message
    const error = repoError || errorMessage;

    const handleSelectLessonPlan = async (lessonPlan: LessonPlan) => {
        try {
            // If the lesson plan doesn't have content, fetch it
            if (!lessonPlan.decoded_content) {
                const fullLessonPlan = await lessonPlanService.getLessonPlan(lessonPlan.path);
                lessonPlanService.setSelectedLessonPlan(fullLessonPlan);
                onLessonPlanSelected(fullLessonPlan);
            } else {
                lessonPlanService.setSelectedLessonPlan(lessonPlan);
                onLessonPlanSelected(lessonPlan);
            }
            onClose();
        } catch (err) {
            logger.error('Error selecting lesson plan:', err);
            // We can't set error state anymore as we're using React Query
            // Just log the error for now
        }
    };

    // Group lesson plans by category
    const groupedLessonPlans = lessonPlans.reduce<Record<string, LessonPlan[]>>((acc, plan) => {
        const categoryKey = plan.category
            ? `${plan.category.number}-${plan.category.title}`
            : 'uncategorized';

        if (!acc[categoryKey]) {
            acc[categoryKey] = [];
        }

        acc[categoryKey].push(plan);
        return acc;
    }, {});

    // Sort categories by number
    const sortedCategories = Object.keys(groupedLessonPlans).sort((a, b) => {
        if (a === 'uncategorized') return 1;
        if (b === 'uncategorized') return -1;

        const aNum = parseInt(a.split('-')[0], 10);
        const bNum = parseInt(b.split('-')[0], 10);
        return aNum - bNum;
    });

    // Filter lesson plans based on search term
    const filteredCategories = sortedCategories.filter(category => {
        const plans = groupedLessonPlans[category];
        return plans.some(plan =>
            plan.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (plan.category?.title.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
        );
    });

    const filteredLessonPlans = lessonPlans.filter(plan =>
        plan.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (plan.category?.title.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
    );

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>Select a Lesson Plan</DialogTitle>
            <DialogContent>
                <DialogContentText>
                    Please select a lesson plan from the _lesson-plans folder to edit.
                </DialogContentText>

                {error && (
                    <Alert severity="error" sx={{mt: 2, mb: 2}}>
                        {error}
                    </Alert>
                )}

                <TextField
                    fullWidth
                    margin="normal"
                    placeholder="Search lesson plans..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon/>
                            </InputAdornment>
                        ),
                    }}
                />

                {loading ? (
                    <Box sx={{display: 'flex', justifyContent: 'center', my: 4}}>
                        <CircularProgress/>
                    </Box>
                ) : lessonPlans.length === 0 || !hasRepo ? (
                    <Box sx={{my: 3}}>
                        <Typography variant="body1" gutterBottom>
                            No lesson plans found in the _lesson-plans folder.
                        </Typography>
                        <Button
                            variant="contained"
                            color="primary"
                            onClick={() => setCreatingNew(true)}
                            startIcon={<AddIcon/>}
                            sx={{mt: 2}}
                        >
                            Create New Lesson Plan
                        </Button>
                    </Box>
                ) : (
                    <>
                        <Box sx={{mt: 2}}>
                            {filteredCategories.length > 0 ? (
                                filteredCategories.map((categoryKey) => {
                                    const plans = groupedLessonPlans[categoryKey].filter(plan =>
                                        plan.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                        (plan.category?.title.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
                                    );

                                    if (plans.length === 0) return null;

                                    const firstPlan = plans[0];
                                    const categoryTitle = categoryKey === 'uncategorized'
                                        ? 'Other Lesson Plans'
                                        : `${firstPlan.category?.number}. ${firstPlan.category?.title}`;

                                    return (
                                        <Accordion key={categoryKey} defaultExpanded={filteredCategories.length === 1}>
                                            <AccordionSummary
                                                expandIcon={<ExpandMoreIcon/>}
                                                aria-controls={`${categoryKey}-content`}
                                                id={`${categoryKey}-header`}
                                            >
                                                <Typography variant="subtitle1" fontWeight="medium">
                                                    {categoryTitle}
                                                    <Chip
                                                        label={plans.length}
                                                        size="small"
                                                        sx={{ml: 1, fontSize: '0.75rem'}}
                                                    />
                                                </Typography>
                                            </AccordionSummary>
                                            <AccordionDetails sx={{p: 0}}>
                                                <List sx={{width: '100%', bgcolor: 'background.paper'}}>
                                                    {plans.map((plan) => (
                                                        <React.Fragment key={plan.path}>
                                                            <ListItem disablePadding>
                                                                <ListItemButton
                                                                    onClick={() => handleSelectLessonPlan(plan)}>
                                                                    <DescriptionIcon
                                                                        sx={{mr: 2, color: 'text.secondary'}}/>
                                                                    <ListItemText
                                                                        primary={plan.name.replace(/\.md$/, '').replace(/-/g, ' ')}
                                                                        secondary={`Path: ${plan.path}`}
                                                                    />
                                                                </ListItemButton>
                                                            </ListItem>
                                                            <Divider component="li"/>
                                                        </React.Fragment>
                                                    ))}
                                                </List>
                                            </AccordionDetails>
                                        </Accordion>
                                    );
                                })
                            ) : (
                                <Box sx={{my: 3, textAlign: 'center'}}>
                                    <Typography variant="body1" gutterBottom>
                                        No lesson plans match your search.
                                    </Typography>
                                </Box>
                            )}
                        </Box>
                    </>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button
                    variant="contained"
                    color="primary"
                    startIcon={<AddIcon/>}
                    onClick={() => setCreatingNew(true)}
                >
                    Create New
                </Button>
            </DialogActions>

            {/* Dialog for creating new lesson plan - to be implemented */}
            <Dialog open={creatingNew} onClose={() => setCreatingNew(false)}>
                <DialogTitle>Create New Lesson Plan</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        This feature is not yet implemented. In a future version, you'll be able to create new lesson
                        plans here.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setCreatingNew(false)}>Close</Button>
                </DialogActions>
            </Dialog>
        </Dialog>
    );
};

export default LessonPlanSelector;
