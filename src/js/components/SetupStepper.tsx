import React, {useEffect, useState} from 'react';
import {useQueryClient} from '@tanstack/react-query';
import {Check, ChevronRight, Folder, GitFork, Search, X} from 'lucide-react';
import logger from '../utils/logger';
import type {Repository} from '../types/github';
import type {LessonPlan} from '../types/lessonPlan';
import {useRepositories} from '../services/githubRepoQueryHooks';
import {useLessonPlans} from '../services/lessonPlanQueryHooks';
import BranchSelector from '../components/BranchSelector';
import {Button} from './ui/button';
import {Input} from './ui/input';
import {Card} from './ui/card';
import {Alert} from './ui/alert';
import {Avatar, AvatarFallback, AvatarImage} from './ui/avatar';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from './ui/select';
import {Spinner} from './ui/spinner';
import {initialsOf} from './editor/editorTypes';
import {cn} from '../lib/utils';

const steps = [
    {label: 'Select repository', description: 'Select a GitHub repository to work with.'},
    {label: 'Select branch', description: 'Choose a branch from the repository to load lesson plans from.'},
    {label: 'Select lesson plan', description: 'Choose a lesson plan from the repository to edit.'},
];

interface SetupStepperProps {
    onComplete: (repo: Repository, lessonPlan: LessonPlan, branch?: string) => void;
}

// Prefer the frontmatter title; fall back to a humanized filename.
const getLessonPlanTitle = (plan: LessonPlan): string =>
    plan.title?.trim() || plan.name.replace(/\.md$/, '').replace(/-/g, ' ');

interface CategoryGroup {
    category: string;
    plans: LessonPlan[];
}

const SetupStepper: React.FC<SetupStepperProps> = ({onComplete}) => {
    const queryClient = useQueryClient();
    const [activeStep, setActiveStep] = useState<number>(0);
    const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null);
    const [selectedBranch, setSelectedBranch] = useState<string | null>(null);
    const [selectedLessonPlan, setSelectedLessonPlan] = useState<LessonPlan | null>(null);

    const {repositories = [], isLoading: loadingRepos} = useRepositories();
    const [repoError, setRepoError] = useState<string | null>(null);

    const {
        data: lessonPlans = [],
        isLoading: loadingLessonPlans,
        error: lessonPlanQueryError,
    } = useLessonPlans(selectedRepo?.owner.login, selectedRepo?.name, selectedBranch || undefined);

    const [lessonPlanError, setLessonPlanError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

    const groupLessonPlansByCategory = (plans: LessonPlan[]): CategoryGroup[] => {
        const categorizedPlans: CategoryGroup[] = [];
        const uncategorizedPlans: LessonPlan[] = [];

        plans.forEach((plan) => {
            if (plan.category && typeof plan.category === 'object' && 'title' in plan.category && plan.category.title) {
                const categoryTitle = plan.category.title;
                const existingCategory = categorizedPlans.find((c) => c.category === categoryTitle);
                if (existingCategory) {
                    existingCategory.plans.push(plan);
                } else {
                    categorizedPlans.push({category: plan.category.title, plans: [plan]});
                }
            } else {
                uncategorizedPlans.push(plan);
            }
        });

        categorizedPlans.sort((a, b) => {
            const planA = plans.find((p) => p.category && typeof p.category === 'object' && 'title' in p.category && p.category.title === a.category);
            const planB = plans.find((p) => p.category && typeof p.category === 'object' && 'title' in p.category && p.category.title === b.category);
            const aNumber = planA?.category && 'number' in planA.category ? planA.category.number || 0 : 0;
            const bNumber = planB?.category && 'number' in planB.category ? planB.category.number || 0 : 0;
            return aNumber - bNumber;
        });

        if (uncategorizedPlans.length > 0) {
            categorizedPlans.push({category: 'Uncategorized', plans: uncategorizedPlans});
        }
        return categorizedPlans;
    };

    const filterLessonPlans = (plans: LessonPlan[]): LessonPlan[] => {
        if (!searchQuery) return plans;
        const query = searchQuery.toLowerCase();
        return plans.filter((plan) => {
            const nameMatch = plan.name.toLowerCase().includes(query);
            const titleMatch = plan.title ? plan.title.toLowerCase().includes(query) : false;
            const categoryMatch =
                plan.category && typeof plan.category === 'object' && 'title' in plan.category && plan.category.title
                    ? plan.category.title.toLowerCase().includes(query)
                    : false;
            return nameMatch || titleMatch || categoryMatch;
        });
    };

    useEffect(() => {
        if (lessonPlanQueryError) {
            setLessonPlanError((lessonPlanQueryError as Error).message);
        }
    }, [lessonPlanQueryError]);

    // Open the first category by default once lesson plans load.
    useEffect(() => {
        if (lessonPlans.length > 0 && expandedCategory === null) {
            const groups = groupLessonPlansByCategory(lessonPlans);
            if (groups.length > 0) setExpandedCategory(groups[0].category);
        }
    }, [lessonPlans]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleNext = () => {
        if (activeStep === 0 && selectedRepo) {
            setActiveStep(1);
        } else if (activeStep === 1 && selectedRepo && selectedBranch) {
            setActiveStep(2);
        } else if (activeStep === 2 && selectedRepo && selectedBranch && selectedLessonPlan) {
            setActiveStep(3);
            onComplete(selectedRepo, selectedLessonPlan, selectedBranch);
        }
    };

    const handleBack = () => setActiveStep((prev) => prev - 1);

    const handleRepoSelected = (repo: Repository) => {
        setSelectedRepo(repo);
        setSelectedBranch(null);
        setSelectedLessonPlan(null);
    };

    const handleLessonPlanSelected = (lessonPlan: LessonPlan) => setSelectedLessonPlan(lessonPlan);

    const handleCreateFork = () => {
        window.open('https://github.com/elixir-europe-training/ELIXIR-TrP-FAIR-Converge/fork', '_blank');
        setRepoError('After creating your fork on GitHub, please refresh this page to see your new fork.');
        queryClient.invalidateQueries({queryKey: ['repositories']});
    };

    const canContinue =
        (activeStep === 0 && !!selectedRepo) ||
        (activeStep === 1 && !!selectedBranch) ||
        (activeStep === 2 && !!selectedLessonPlan);

    return (
        <div className="mx-auto max-w-3xl">
            <Card className="p-6">
                {steps.map((step, index) => {
                    const isActive = activeStep === index;
                    const isDone = activeStep > index;
                    const isLast = index === steps.length - 1;
                    return (
                        <div key={step.label} className="flex gap-4">
                            {/* Rail */}
                            <div className="flex flex-col items-center">
                                <div
                                    className={cn(
                                        'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm font-semibold',
                                        isDone || isActive ? 'bg-navy text-white' : 'bg-zinc-100 text-zinc-400',
                                    )}
                                >
                                    {isDone ? <Check className="h-4 w-4" /> : index + 1}
                                </div>
                                {!isLast && <div className="my-1 w-px flex-1 bg-border" />}
                            </div>

                            {/* Content */}
                            <div className={cn('flex-1', isLast ? 'pb-0' : 'pb-6')}>
                                <div
                                    className={cn(
                                        'pt-1 text-[15px] font-semibold',
                                        isActive || isDone ? 'text-navy' : 'text-muted-foreground',
                                    )}
                                >
                                    {step.label}
                                </div>

                                {isActive && (
                                    <div className="mt-1">
                                        <p className="text-sm text-muted-foreground">{step.description}</p>

                                        {/* Step 0: Repository */}
                                        {index === 0 && (
                                            <div className="mt-3 max-w-xl">
                                                {loadingRepos ? (
                                                    <div className="flex justify-center py-8">
                                                        <Spinner />
                                                    </div>
                                                ) : repoError ? (
                                                    <Alert variant="error">{repoError}</Alert>
                                                ) : (
                                                    <>
                                                        <Select
                                                            value={selectedRepo ? String(selectedRepo.id) : ''}
                                                            onValueChange={(id) => {
                                                                const repo = repositories.find(
                                                                    (r: Repository) => String(r.id) === id,
                                                                );
                                                                if (repo) handleRepoSelected(repo);
                                                            }}
                                                        >
                                                            <SelectTrigger className="h-auto w-full py-2">
                                                                {selectedRepo ? (
                                                                    <span className="flex items-center gap-2">
                                                                        <Avatar className="h-6 w-6">
                                                                            <AvatarImage
                                                                                src={selectedRepo.owner.avatar_url}
                                                                                alt={selectedRepo.owner.login}
                                                                            />
                                                                            <AvatarFallback className="bg-zinc-200 text-[10px]">
                                                                                {initialsOf(selectedRepo.owner.login)}
                                                                            </AvatarFallback>
                                                                        </Avatar>
                                                                        <span className="text-sm font-medium text-zinc-900">
                                                                            {selectedRepo.full_name}
                                                                        </span>
                                                                    </span>
                                                                ) : (
                                                                    <SelectValue placeholder="Select a repository" />
                                                                )}
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {repositories.map((repo: Repository) => (
                                                                    <SelectItem key={repo.id} value={String(repo.id)}>
                                                                        <span className="flex items-center gap-2">
                                                                            <Avatar className="h-6 w-6">
                                                                                <AvatarImage
                                                                                    src={repo.owner.avatar_url}
                                                                                    alt={repo.owner.login}
                                                                                />
                                                                                <AvatarFallback className="bg-zinc-200 text-[10px]">
                                                                                    {initialsOf(repo.owner.login)}
                                                                                </AvatarFallback>
                                                                            </Avatar>
                                                                            <span className="text-sm font-medium text-zinc-900">
                                                                                {repo.full_name}
                                                                            </span>
                                                                        </span>
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>

                                                        <div className="mt-4">
                                                            <Button variant="outline" onClick={handleCreateFork}>
                                                                <GitFork className="h-4 w-4" />
                                                                Fork on GitHub
                                                            </Button>
                                                            <p className="mt-2 text-xs text-muted-foreground">
                                                                After creating your fork, refresh this page to see it in the list.
                                                            </p>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        )}

                                        {/* Step 1: Branch */}
                                        {index === 1 && (
                                            <div className="mt-3">
                                                <BranchSelector
                                                    onBranchSelected={(branch) => {
                                                        logger.log('Branch selected:', branch);
                                                        setSelectedBranch(branch);
                                                    }}
                                                    onBack={handleBack}
                                                    repository={selectedRepo || undefined}
                                                    repoId={selectedRepo?.id}
                                                />
                                            </div>
                                        )}

                                        {/* Step 2: Lesson plan */}
                                        {index === 2 && (
                                            <div className="mt-3">
                                                {lessonPlanError && (
                                                    <Alert variant="error" className="mb-2">
                                                        {lessonPlanError}
                                                    </Alert>
                                                )}

                                                {loadingLessonPlans ? (
                                                    <div className="flex justify-center py-6">
                                                        <Spinner />
                                                    </div>
                                                ) : (
                                                    <>
                                                        <div className="relative mb-3">
                                                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                                            <Input
                                                                value={searchQuery}
                                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                                placeholder="Search lesson plans…"
                                                                className="pl-9 pr-9"
                                                            />
                                                            {searchQuery && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setSearchQuery('')}
                                                                    aria-label="Clear search"
                                                                    className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 cursor-pointer appearance-none items-center justify-center rounded-md border-0 bg-transparent text-muted-foreground hover:bg-accent"
                                                                >
                                                                    <X className="h-4 w-4" />
                                                                </button>
                                                            )}
                                                        </div>

                                                        <div className="w-full overflow-hidden rounded-md border border-border">
                                                            {groupLessonPlansByCategory(filterLessonPlans(lessonPlans)).map(
                                                                (categoryGroup) => {
                                                                    const isOpen =
                                                                        searchQuery.length > 0 ||
                                                                        expandedCategory === categoryGroup.category;
                                                                    return (
                                                                        <div
                                                                            key={categoryGroup.category}
                                                                            className="border-b border-border last:border-b-0"
                                                                        >
                                                                            {/* Category folder header */}
                                                                            <button
                                                                                type="button"
                                                                                onClick={() =>
                                                                                    setExpandedCategory(
                                                                                        isOpen && !searchQuery
                                                                                            ? null
                                                                                            : categoryGroup.category,
                                                                                    )
                                                                                }
                                                                                className="flex w-full cursor-pointer appearance-none items-center gap-2 border-0 bg-transparent px-3 py-2.5 text-left transition-colors hover:bg-accent"
                                                                            >
                                                                                <ChevronRight
                                                                                    className={cn(
                                                                                        'h-4 w-4 flex-shrink-0 text-muted-foreground transition-transform',
                                                                                        isOpen && 'rotate-90',
                                                                                    )}
                                                                                />
                                                                                <Folder className="h-4 w-4 flex-shrink-0 text-teal" />
                                                                                <span className="flex-1 text-sm font-medium text-zinc-900">
                                                                                    {categoryGroup.category}
                                                                                </span>
                                                                                <span className="text-xs text-muted-foreground">
                                                                                    {categoryGroup.plans.length}
                                                                                </span>
                                                                            </button>

                                                                            {/* Lesson plans within the category */}
                                                                            {isOpen && (
                                                                                <div className="flex flex-col gap-1 px-2 pb-2">
                                                                                    {categoryGroup.plans.map((plan) => {
                                                                                        const selected =
                                                                                            selectedLessonPlan?.path === plan.path;
                                                                                        return (
                                                                                            <button
                                                                                                key={plan.path}
                                                                                                type="button"
                                                                                                onClick={() =>
                                                                                                    handleLessonPlanSelected(plan)
                                                                                                }
                                                                                                className={cn(
                                                                                                    'flex cursor-pointer appearance-none items-center gap-2 rounded-md border px-3 py-2 text-left transition-colors',
                                                                                                    selected
                                                                                                        ? 'border-navy bg-teal-surface'
                                                                                                        : 'border-transparent bg-transparent hover:bg-accent',
                                                                                                )}
                                                                                            >
                                                                                                <span className="flex flex-1 flex-col">
                                                                                                    <span className="text-sm font-medium text-zinc-900">
                                                                                                        {getLessonPlanTitle(plan)}
                                                                                                    </span>
                                                                                                    <span className="text-xs text-muted-foreground">
                                                                                                        {plan.name}
                                                                                                    </span>
                                                                                                </span>
                                                                                                {selected && (
                                                                                                    <Check className="h-4 w-4 flex-shrink-0 text-navy" />
                                                                                                )}
                                                                                            </button>
                                                                                        );
                                                                                    })}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    );
                                                                },
                                                            )}
                                                        </div>

                                                        {filterLessonPlans(lessonPlans).length === 0 && (
                                                            <Alert variant="info" className="mt-2">
                                                                No lesson plans found matching your search.
                                                            </Alert>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        )}

                                        {/* Navigation */}
                                        <div className="mt-4 flex gap-2">
                                            <Button onClick={handleNext} disabled={!canContinue}>
                                                {isLast ? 'Finish' : 'Continue'}
                                                <ChevronRight className="h-4 w-4" />
                                            </Button>
                                            {index > 0 && (
                                                <Button variant="ghost" onClick={handleBack}>
                                                    Back
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </Card>
        </div>
    );
};

export default SetupStepper;
