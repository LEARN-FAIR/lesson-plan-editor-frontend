import React, {useEffect, useState} from 'react';
import {useQueryClient} from '@tanstack/react-query';
import logger from '../utils/logger';
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Alert,
    Avatar,
    Box,
    Button,
    ButtonGroup, Card, Chip,
    CircularProgress,
    Container,
    IconButton,
    InputAdornment,
    List,
    ListItem,
    ListItemAvatar,
    ListItemButton,
    ListItemText,
    Paper,
    Step,
    StepContent,
    StepLabel,
    Stepper,
    TextField,
    Typography
} from '@mui/material';
import LocalOfferOutlinedIcon from '@mui/icons-material/LocalOfferOutlined';
import UndoIcon from '@mui/icons-material/Undo';
import SearchIcon from '@mui/icons-material/Search';
import ForkRightIcon from '@mui/icons-material/ForkRight';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import type {Repository} from '../types/github';
import type {LessonPlan} from '../types/lessonPlan';
import {useRepositories} from '../services/githubRepoQueryHooks';
import {useLessonPlans} from '../services/lessonPlanQueryHooks';
import BranchSelector from '../components/BranchSelector';

const steps = [
    {
        label: 'Select repository',
        description: 'Select a GitHub repository to work with.'
    },
    {
        label: 'Select branch',
        description: 'Choose a branch from the repository to load lesson plans from.'
    },
    {
        label: 'Select lesson plan',
        description: 'Choose a lesson plan from the repository to edit.'
    }
];

interface SetupStepperProps {
    onComplete: (repo: Repository, lessonPlan: LessonPlan, branch?: string) => void;
}

// Prefer the frontmatter title; fall back to a humanized filename when a lesson
// plan has no title defined.
const getLessonPlanTitle = (plan: LessonPlan): string =>
    plan.title?.trim() || plan.name.replace(/\.md$/, '').replace(/-/g, ' ');

const SetupStepper: React.FC<SetupStepperProps> = ({onComplete}) => {
    const queryClient = useQueryClient();
    const [activeStep, setActiveStep] = useState<number>(0);
    const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null);
    const [selectedBranch, setSelectedBranch] = useState<string | null>(null);
    const [selectedLessonPlan, setSelectedLessonPlan] = useState<LessonPlan | null>(null);

    // Use Repository Context to access repositories
    const {
        repositories = [],
        isLoading: loadingRepos,
        error: repoQueryError
    } = useRepositories();

    // Custom error state for repositories
    const [repoError, setRepoError] = useState<string | null>(null);

    // Use React Query to fetch lesson plans
    const {
        data: lessonPlans = [],
        isLoading: loadingLessonPlans,
        error: lessonPlanQueryError
    } = useLessonPlans(selectedRepo?.owner.login, selectedRepo?.name, selectedBranch || undefined);

    // Custom error state for lesson plans
    const [lessonPlanError, setLessonPlanError] = useState<string | null>(null);

    // Other state
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

    // Set up lesson plans when data is loaded
    useEffect(() => {
        if (lessonPlans.length > 0) {
            // If there are categories, expand the first one
            const categories = groupLessonPlansByCategory(lessonPlans);
            if (categories.length > 0) {
                setExpandedCategory(categories[0].category);
            }
        }

        // Set error state if React Query had errors
        if (lessonPlanQueryError) {
            setLessonPlanError((lessonPlanQueryError as Error).message);
        }
    }, [lessonPlans, lessonPlanQueryError]);

    const handleNext = () => {
        if (activeStep === 0) {
            // After repository selection, move to branch selection
            if (selectedRepo) {
                setActiveStep(1);
            }
        } else if (activeStep === 1) {
            // After branch selection, move to lesson plan selection
            if (selectedRepo && selectedBranch) {
                setActiveStep(2);
            }
        } else if (activeStep === 2) {
            // After lesson plan selection, complete the setup
            if (selectedRepo && selectedBranch && selectedLessonPlan) {
                setActiveStep(3);
                onComplete(selectedRepo, selectedLessonPlan, selectedBranch);
            }
        }
    };

    const handleBack = () => {
        setActiveStep((prevActiveStep) => prevActiveStep - 1);
    };

    const handleReset = () => {
        setActiveStep(0);
        setSelectedRepo(null);
        setSelectedBranch(null);
        setSelectedLessonPlan(null);
    };

    const handleRepoSelected = (repo: Repository) => {
        setSelectedRepo(repo);
        setSelectedBranch(null);
        setSelectedLessonPlan(null);
        // React Query will automatically refetch lesson plans when repo/branch changes
    };

    const handleBranchSelected = (branch: string) => {
        setSelectedBranch(branch);
        setSelectedLessonPlan(null);
        // React Query will automatically refetch lesson plans when branch changes
    };

    const handleLessonPlanSelected = (lessonPlan: LessonPlan) => {
        setSelectedLessonPlan(lessonPlan);
        // No longer storing in service - parent component handles state
    };

    // Repository step functions
    const refreshRepositories = () => {
        // Invalidate and refetch repositories
        queryClient.invalidateQueries({queryKey: ['repositories']});
    };

    const handleCreateFork = () => {
        // Open GitHub fork page in a new tab
        window.open('https://github.com/elixir-europe-training/ELIXIR-TrP-FAIR-Converge/fork', '_blank');

        // Show a message to the user about refreshing after forking
        setRepoError('After creating your fork on GitHub, please refresh this page to see your new fork.');

        // Invalidate repositories query to prompt a refetch
        queryClient.invalidateQueries({queryKey: ['repositories']});
    };

    // Lesson plan step functions
    const refreshLessonPlans = () => {
        // Invalidate and refetch lesson plans
        queryClient.invalidateQueries({queryKey: ['lessonPlans']});
    };

    // Group lesson plans by category
    interface CategoryGroup {
        category: string;
        plans: LessonPlan[];
    }

    const groupLessonPlansByCategory = (plans: LessonPlan[]): CategoryGroup[] => {
        const categorizedPlans: CategoryGroup[] = [];
        const uncategorizedPlans: LessonPlan[] = [];

        // Group plans by category
        plans.forEach(plan => {
            if (plan.category && typeof plan.category === 'object' && 'title' in plan.category && plan.category.title) {
                const categoryTitle = plan.category.title;
                const existingCategory = categorizedPlans.find(c => c.category === categoryTitle);
                if (existingCategory) {
                    existingCategory.plans.push(plan);
                } else {
                    categorizedPlans.push({
                        category: plan.category.title,
                        plans: [plan]
                    });
                }
            } else {
                uncategorizedPlans.push(plan);
            }
        });

        // Sort categories by number if available
        categorizedPlans.sort((a, b) => {
            // Find plans with matching categories and get their category numbers
            const planA = plans.find(p => p.category && typeof p.category === 'object' && 'title' in p.category && p.category.title === a.category);
            const planB = plans.find(p => p.category && typeof p.category === 'object' && 'title' in p.category && p.category.title === b.category);
            const aNumber = planA?.category && 'number' in planA.category ? planA.category.number || 0 : 0;
            const bNumber = planB?.category && 'number' in planB.category ? planB.category.number || 0 : 0;
            return aNumber - bNumber;
        });

        // Add uncategorized plans at the end if any
        if (uncategorizedPlans.length > 0) {
            categorizedPlans.push({
                category: 'Uncategorized',
                plans: uncategorizedPlans
            });
        }

        return categorizedPlans;
    };

    // Filter lesson plans based on search query
    const filterLessonPlans = (plans: LessonPlan[]): LessonPlan[] => {
        if (!searchQuery) return plans;

        const query = searchQuery.toLowerCase();
        return plans.filter(plan => {
            const nameMatch = plan.name.toLowerCase().includes(query);
            const titleMatch = plan.title ? plan.title.toLowerCase().includes(query) : false;
            const categoryMatch = plan.category && typeof plan.category === 'object' && 'title' in plan.category && plan.category.title ?
                plan.category.title.toLowerCase().includes(query) : false;
            return nameMatch || titleMatch || categoryMatch;
        });
    };

    const handleToggleCategory = (category: string) => {
        setExpandedCategory(expandedCategory === category ? null : category);
    };

    return (
        <Container maxWidth="md" sx={{mt: 4}}>
            <Paper elevation={3} sx={{p: 3}}>
                <Stepper activeStep={activeStep} orientation="vertical">
                    {steps.map((step, index) => (
                        <Step key={step.label}>
                            <StepLabel>
                                <Typography variant="subtitle1">{step.label}</Typography>
                            </StepLabel>
                            <StepContent>
                                <Typography>{step.description}</Typography>

                                {/* Repository Selection Step */}
                                {index === 0 && (
                                    <Box sx={{maxWidth: 600, mt: 2}}>
                                        {loadingRepos ? (
                                            <Box display="flex" justifyContent="center" my={4}>
                                                <CircularProgress/>
                                            </Box>
                                        ) : repoError ? (
                                            <Alert severity="error" sx={{mt: 2}}>
                                                {repoError}
                                            </Alert>
                                        ) : (
                                            <>
                                                <List>
                                                    {repositories.map((repo: Repository) => (
                                                        <ListItem key={repo.id} disablePadding>
                                                            <ListItemButton
                                                                onClick={() => handleRepoSelected(repo)}
                                                                selected={selectedRepo?.id === repo.id}
                                                            >
                                                                <ListItemAvatar>
                                                                    <Avatar src={repo.owner.avatar_url}
                                                                            alt={repo.owner.login}/>
                                                                </ListItemAvatar>
                                                                <ListItemText
                                                                    primary={repo.full_name}
                                                                />
                                                            </ListItemButton>
                                                        </ListItem>
                                                    ))}
                                                </List>

                                                <Button
                                                    variant="outlined"
                                                    color="primary"
                                                    onClick={handleCreateFork}
                                                    startIcon={<ForkRightIcon/>}
                                                    sx={{mb: 2}}
                                                >
                                                    Fork on GitHub
                                                </Button>
                                                <Typography variant="caption" display="block">
                                                    After creating your fork, refresh this page to see it in the list.
                                                </Typography>
                                            </>
                                        )}
                                    </Box>
                                )}

                                {/* Branch Selection Step */}
                                {index === 1 && (
                                    <Box sx={{mt: 2}}>
                                        <BranchSelector
                                            onBranchSelected={(branch) => {
                                                logger.log('Branch selected:', branch);
                                                setSelectedBranch(branch);
                                            }}
                                            onBack={() => handleBack()}
                                            repository={selectedRepo || undefined}
                                            repoId={selectedRepo?.id} // Pass repo ID to trigger refresh when repo changes
                                        />
                                    </Box>
                                )}

                                {/* Lesson Plan Selection Step */}
                                {index === 2 && (
                                    <Box sx={{mt: 2}}>
                                        {lessonPlanError && (
                                            <Alert severity="error" sx={{mb: 2}}>
                                                {lessonPlanError}
                                            </Alert>
                                        )}

                                        {loadingLessonPlans ? (
                                            <Box sx={{display: 'flex', justifyContent: 'center', my: 2}}>
                                                <CircularProgress/>
                                            </Box>
                                        ) : (
                                            <Box>
                                                {selectedLessonPlan ? (
                                                    <Card variant="outlined" sx={{mt: 2, p: 2, borderRadius: 1}}>
                                                        {selectedLessonPlan.category && typeof selectedLessonPlan.category === 'object' && 'title' in selectedLessonPlan.category && (
                                                            <Chip size="small" icon={<LocalOfferOutlinedIcon/>}
                                                                  label={selectedLessonPlan.category.title}
                                                                  variant="outlined"/>
                                                        )}
                                                        <Typography variant="subtitle1"
                                                                    sx={{fontWeight: 'bold', mt: 1}}>
                                                            {getLessonPlanTitle(selectedLessonPlan)}
                                                        </Typography>
                                                        <Typography variant="body2" color="text.secondary" sx={{mb: 2}}>
                                                            {selectedLessonPlan.name}
                                                        </Typography>
                                                        <Button
                                                            variant="outlined"
                                                            size="small"
                                                            sx={{mt: 2}}
                                                            onClick={() => setSelectedLessonPlan(null)}
                                                            startIcon={<UndoIcon/>}
                                                        >
                                                            Change selection
                                                        </Button>
                                                    </Card>
                                                ) : (
                                                    <>
                                                        <TextField
                                                            fullWidth
                                                            variant="outlined"
                                                            placeholder="Search lesson plans..."
                                                            value={searchQuery}
                                                            onChange={(e) => setSearchQuery(e.target.value)}
                                                            sx={{mb: 2}}
                                                            InputProps={{
                                                                startAdornment: (
                                                                    <InputAdornment position="start">
                                                                        <SearchIcon/>
                                                                    </InputAdornment>
                                                                ),
                                                                endAdornment: searchQuery ? (
                                                                    <InputAdornment position="end">
                                                                        <IconButton onClick={() => setSearchQuery('')}
                                                                                    size="small">
                                                                            ×
                                                                        </IconButton>
                                                                    </InputAdornment>
                                                                ) : null
                                                            }}
                                                        />
                                                        {}
                                                        {groupLessonPlansByCategory(filterLessonPlans(lessonPlans)).map((categoryGroup) => (
                                                            <Accordion
                                                                key={categoryGroup.category}
                                                                expanded={expandedCategory === categoryGroup.category}
                                                                onChange={() => handleToggleCategory(categoryGroup.category)}
                                                            >
                                                                <AccordionSummary expandIcon={<ExpandMoreIcon/>}>
                                                                    <Typography variant="subtitle1">
                                                                        {categoryGroup.category} ({categoryGroup.plans.length})
                                                                    </Typography>
                                                                </AccordionSummary>
                                                                <AccordionDetails sx={{p: 0}}>
                                                                    <List dense>
                                                                        {categoryGroup.plans.map((plan) => (
                                                                            <ListItem key={plan.path} disablePadding>
                                                                                <ListItemButton
                                                                                    onClick={() => handleLessonPlanSelected(plan)}
                                                                                    sx={{
                                                                                        borderRadius: 1,
                                                                                        mx: 1,
                                                                                        mb: 0.5
                                                                                    }}
                                                                                >
                                                                                    <ListItemText
                                                                                        primary={getLessonPlanTitle(plan)}
                                                                                        secondary={plan.name}
                                                                                    />
                                                                                </ListItemButton>
                                                                            </ListItem>
                                                                        ))}
                                                                    </List>
                                                                </AccordionDetails>
                                                            </Accordion>
                                                        ))}

                                                        {filterLessonPlans(lessonPlans).length === 0 && (
                                                            <Alert severity="info" sx={{mt: 2}}>
                                                                No lesson plans found matching your search.
                                                            </Alert>
                                                        )}
                                                    </>
                                                )}
                                            </Box>
                                        )}
                                    </Box>
                                )}

                                <Box sx={{mb: 2, mt: 2}}>
                                    <div>
                                        <Button
                                            variant="contained"
                                            onClick={handleNext}
                                            sx={{mt: 1, mr: 1}}
                                            disabled={index === 0 && !selectedRepo || index === 1 && !selectedBranch || index === 2 && !selectedLessonPlan}
                                            endIcon={<NavigateNextIcon/>}
                                        >
                                            {index === steps.length - 1 ? 'Finish' : 'Continue'}
                                        </Button>
                                        {index > 0 && <Button
                                            disabled={index === 0}
                                            onClick={handleBack}
                                            sx={{mt: 1, mr: 1}}
                                        >
                                            Back
                                        </Button>}
                                    </div>
                                </Box>
                            </StepContent>
                        </Step>
                    ))}
                </Stepper>
            </Paper>
        </Container>
    );
};

export default SetupStepper;
