import * as React from 'react';
import {Slot} from '@radix-ui/react-slot';
import {cva, type VariantProps} from 'class-variance-authority';
import {cn} from '../../lib/utils';

const buttonVariants = cva(
    // `appearance-none bg-transparent` reset the native button chrome because
    // Tailwind's preflight is disabled in this project; variants below re-apply
    // their own background where needed.
    'inline-flex appearance-none cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-md border border-transparent bg-transparent text-sm font-medium leading-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50',
    {
        variants: {
            variant: {
                default: 'bg-primary text-primary-foreground hover:bg-primary/90',
                teal: 'bg-teal text-white hover:bg-teal/90',
                success: 'bg-emerald-600 text-white hover:bg-emerald-600/90',
                destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
                outline: 'border-input bg-background text-foreground hover:bg-accent hover:text-accent-foreground',
                secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
                ghost: 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                link: 'text-teal underline-offset-4 hover:underline',
            },
            size: {
                default: 'h-9 px-4 py-2',
                sm: 'h-8 rounded-md px-3.5 py-2 text-[12.5px] font-semibold',
                xs: 'h-7 rounded-md px-3 text-xs font-semibold',
                lg: 'h-11 rounded-md px-6',
                icon: 'h-8 w-8',
            },
        },
        defaultVariants: {
            variant: 'default',
            size: 'default',
        },
    },
);

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
        VariantProps<typeof buttonVariants> {
    asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({className, variant, size, asChild = false, ...props}, ref) => {
        const Comp = asChild ? Slot : 'button';
        return (
            <Comp className={cn(buttonVariants({variant, size, className}))} ref={ref} {...props} />
        );
    },
);
Button.displayName = 'Button';

export {Button, buttonVariants};
