import * as React from 'react';
import {Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle} from './dialog';
import {Button} from './button';

export interface ConfirmOptions {
    title?: string;
    description?: React.ReactNode;
    confirmLabel?: string;
    cancelLabel?: string;
    /** Style the confirm button as a destructive action (default true). */
    destructive?: boolean;
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = React.createContext<ConfirmFn | null>(null);

/**
 * Promise-based confirmation. Wrap a subtree in <ConfirmProvider> and call the
 * function returned by useConfirm(); it resolves true on confirm, false on cancel.
 */
export const ConfirmProvider: React.FC<{children: React.ReactNode}> = ({children}) => {
    const [options, setOptions] = React.useState<ConfirmOptions | null>(null);
    const resolverRef = React.useRef<((value: boolean) => void) | null>(null);

    const confirm = React.useCallback<ConfirmFn>((opts) => {
        setOptions(opts);
        return new Promise<boolean>((resolve) => {
            resolverRef.current = resolve;
        });
    }, []);

    const settle = (value: boolean) => {
        resolverRef.current?.(value);
        resolverRef.current = null;
        setOptions(null);
    };

    return (
        <ConfirmContext.Provider value={confirm}>
            {children}
            <Dialog open={options !== null} onOpenChange={(open) => !open && settle(false)}>
                {options && (
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle>{options.title ?? 'Are you sure?'}</DialogTitle>
                            {options.description && <DialogDescription>{options.description}</DialogDescription>}
                        </DialogHeader>
                        <DialogFooter>
                            <Button variant="secondary" onClick={() => settle(false)}>
                                {options.cancelLabel ?? 'Cancel'}
                            </Button>
                            <Button
                                variant={options.destructive === false ? 'default' : 'destructive'}
                                onClick={() => settle(true)}
                            >
                                {options.confirmLabel ?? 'Delete'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                )}
            </Dialog>
        </ConfirmContext.Provider>
    );
};

export const useConfirm = (): ConfirmFn => {
    const ctx = React.useContext(ConfirmContext);
    if (!ctx) throw new Error('useConfirm must be used within a ConfirmProvider');
    return ctx;
};
