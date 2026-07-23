import { cn } from "@/lib/utils"
import { Loader2Icon } from "lucide-react"

function Spinner({ className, ...props }: React.ComponentProps<"svg">) {
  return (
    <Loader2Icon data-slot="spinner" role="status" aria-label="Loading" className={cn("size-4 animate-spin", className)} {...props} />
  )
}

/** Full-viewport centered spinner used while a route/page is loading. */
function PageSpinner({ className }: { className?: string }) {
  return (
    <div className={cn("flex h-screen w-full items-center justify-center", className)}>
      <Spinner className="size-9 text-muted-foreground" />
    </div>
  )
}

export { Spinner, PageSpinner }
