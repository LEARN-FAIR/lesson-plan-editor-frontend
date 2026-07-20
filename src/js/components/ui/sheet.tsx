import * as React from 'react';
import * as SheetPrimitive from '@radix-ui/react-dialog';
import {cn} from '../../lib/utils';

const Sheet = SheetPrimitive.Root;
const SheetTrigger = SheetPrimitive.Trigger;
const SheetClose = SheetPrimitive.Close;
const SheetPortal = SheetPrimitive.Portal;

const SheetOverlay = React.forwardRef<
    React.ElementRef<typeof SheetPrimitive.Overlay>,
    React.ComponentPropsWithoutRef<typeof SheetPrimitive.Overlay>
>(({className, ...props}, ref) => (
    <SheetPrimitive.Overlay
        ref={ref}
        className={cn(
            'absolute inset-0 z-40 bg-black/40 data-[state=open]:animate-fade-in data-[state=closed]:animate-fade-out',
            className,
        )}
        {...props}
    />
));
SheetOverlay.displayName = SheetPrimitive.Overlay.displayName;

/**
 * A right-anchored slide-over panel. Rendered into a container (the editor's
 * scroll area) via a Portal `container`, so the scrim covers only the content
 * region — not the app header — matching the design handoff.
 */
const SheetContent = React.forwardRef<
    React.ElementRef<typeof SheetPrimitive.Content>,
    React.ComponentPropsWithoutRef<typeof SheetPrimitive.Content> & {
        container?: HTMLElement | null;
    }
>(({className, children, container, ...props}, ref) => (
    <SheetPortal container={container ?? undefined}>
        <SheetOverlay />
        <SheetPrimitive.Content
            ref={ref}
            className={cn(
                'absolute inset-y-0 right-0 z-50 flex w-[380px] max-w-full flex-col gap-0 overflow-auto border-l border-border bg-background p-[26px] shadow-[-4px_0_16px_rgba(0,0,0,0.08)] focus:outline-none',
                'data-[state=open]:animate-slide-in-right data-[state=closed]:animate-slide-out-right',
                className,
            )}
            {...props}
        >
            {children}
        </SheetPrimitive.Content>
    </SheetPortal>
));
SheetContent.displayName = SheetPrimitive.Content.displayName;

const SheetTitle = React.forwardRef<
    React.ElementRef<typeof SheetPrimitive.Title>,
    React.ComponentPropsWithoutRef<typeof SheetPrimitive.Title>
>(({className, ...props}, ref) => (
    <SheetPrimitive.Title
        ref={ref}
        className={cn('text-base font-semibold text-navy', className)}
        {...props}
    />
));
SheetTitle.displayName = SheetPrimitive.Title.displayName;

const SheetDescription = React.forwardRef<
    React.ElementRef<typeof SheetPrimitive.Description>,
    React.ComponentPropsWithoutRef<typeof SheetPrimitive.Description>
>(({className, ...props}, ref) => (
    <SheetPrimitive.Description
        ref={ref}
        className={cn('text-sm text-muted-foreground', className)}
        {...props}
    />
));
SheetDescription.displayName = SheetPrimitive.Description.displayName;

export {
    Sheet,
    SheetTrigger,
    SheetClose,
    SheetContent,
    SheetOverlay,
    SheetPortal,
    SheetTitle,
    SheetDescription,
};
