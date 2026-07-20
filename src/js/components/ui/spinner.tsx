import * as React from 'react';
import {Loader2} from 'lucide-react';
import {cn} from '../../lib/utils';

export interface SpinnerProps extends React.SVGAttributes<SVGSVGElement> {
    size?: number;
}

/** Simple loading spinner (lucide Loader2 + Tailwind spin). */
const Spinner: React.FC<SpinnerProps> = ({size = 24, className, ...props}) => (
    <Loader2
        width={size}
        height={size}
        className={cn('animate-spin text-primary', className)}
        {...props}
    />
);

/** Full-viewport centered spinner used for route/page loading states. */
export const PageSpinner: React.FC<{size?: number}> = ({size = 40}) => (
    <div className="flex h-screen w-full items-center justify-center">
        <Spinner size={size} />
    </div>
);

export {Spinner};
