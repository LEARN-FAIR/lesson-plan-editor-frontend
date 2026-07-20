import * as React from 'react';
import {cva, type VariantProps} from 'class-variance-authority';
import {cn} from '../../lib/utils';

const badgeVariants = cva(
    'inline-flex items-center rounded-full px-[9px] py-[3px] text-[11.5px] font-semibold leading-tight',
    {
        variants: {
            variant: {
                default: 'bg-secondary text-secondary-foreground',
                meta: 'bg-zinc-100 text-zinc-600',
                beginner: 'bg-teal-surface text-teal-ink',
                intermediate: 'bg-teal-surface-mid text-teal-ink',
                expert: 'bg-navy text-white',
                status: 'bg-teal-surface text-teal-ink px-[10px] py-[4px] text-[12.5px]',
            },
        },
        defaultVariants: {
            variant: 'default',
        },
    },
);

export interface BadgeProps
    extends React.HTMLAttributes<HTMLSpanElement>,
        VariantProps<typeof badgeVariants> {}

function Badge({className, variant, ...props}: BadgeProps) {
    return <span className={cn(badgeVariants({variant}), className)} {...props} />;
}

export {Badge, badgeVariants};
