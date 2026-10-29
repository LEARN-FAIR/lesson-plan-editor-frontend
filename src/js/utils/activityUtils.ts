import type {Activity} from '../types';

/** Return the learning outcome positions (1-based) linked to an activity. */
export const getActivityLearningOutcomes = (activity: Activity): number[] =>
    (activity.learning_outcomes || []).filter((lo) => lo !== null && lo !== undefined);

/**
 * Activities reference outcomes by 1-based position, so removing or moving an
 * outcome must renumber those references. `mapIndex` maps an old position to a
 * new one, or null to drop the reference.
 */
export const remapActivityOutcomes = (
    activities: {before: Activity[]; during: Activity[]; after: Activity[]},
    mapIndex: (position: number) => number | null,
) => {
    const remap = (list: Activity[] = []) =>
        list.map((activity) => {
            if (!activity.learning_outcomes) return activity;
            const mapped = activity.learning_outcomes
                .map(mapIndex)
                .filter((n): n is number => n !== null)
                .sort((a, b) => a - b);
            return {...activity, learning_outcomes: mapped};
        });
    return {before: remap(activities?.before), during: remap(activities?.during), after: remap(activities?.after)};
};
