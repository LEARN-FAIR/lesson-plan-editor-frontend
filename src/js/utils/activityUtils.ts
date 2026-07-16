import type {Activity} from '../types';

/**
 * Return the learning outcome ids associated with an activity as an array,
 * normalizing across the current `learning_outcomes` list field and the
 * deprecated single-value `learning_outcome` field.
 */
export const getActivityLearningOutcomes = (activity: Activity): number[] => {
    if (Array.isArray(activity.learning_outcomes)) {
        return activity.learning_outcomes.filter((lo) => lo !== null && lo !== undefined);
    }

    if (activity.learning_outcome !== null && activity.learning_outcome !== undefined) {
        return [activity.learning_outcome];
    }

    return [];
};
