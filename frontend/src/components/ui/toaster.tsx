import { useToast } from "@/hooks/use-toast"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

export function Toaster() {
  const { toasts, dismiss } = useToast()

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full">
      {toasts.map(({ id, title, description, variant, open }) => (
        <div
          key={id}
          className={cn(
            "rounded-lg border p-4 shadow-lg transition-all flex items-start gap-3",
            "animate-fade-in",
            variant === 'destructive'
              ? 'bg-destructive text-destructive-foreground border-destructive'
              : 'bg-card text-card-foreground border-border'
          )}
        >
          <div className="flex-1">
            {title && <div className="font-semibold text-sm">{title}</div>}
            {description && <div className="text-sm mt-0.5 opacity-90">{description}</div>}
          </div>
          <button onClick={() => dismiss(id)} className="flex-shrink-0 opacity-70 hover:opacity-100 transition-opacity">
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  )
}
