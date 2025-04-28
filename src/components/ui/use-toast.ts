import { useToast, toast } from "@/hooks/use-toast";
import { Toast } from "@/components/ui/toast"

interface ToastProps extends React.ComponentPropsWithoutRef<typeof Toast> {
  variant?: "default" | "destructive" | "success"
}

export { useToast, toast };
