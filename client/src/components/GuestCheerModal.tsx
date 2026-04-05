import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function GuestCheerModal({ open, onOpenChange }: Props) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-[#0a0a0a] border-white/10 text-white max-w-sm">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-sm font-display uppercase tracking-[0.2em] text-primary">
            Login required
          </AlertDialogTitle>
          <AlertDialogDescription className="text-zinc-300 text-sm normal-case tracking-normal">
            Please log in to use this feature. Actions like likes and comments are available after login.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction
            className="w-full bg-primary text-black hover:brightness-110 sm:w-auto"
            onClick={() => onOpenChange(false)}
          >
            OK
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
