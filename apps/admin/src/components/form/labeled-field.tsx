import { cn } from "@/lib/utils";

type Props = {
  label: string;
  children: React.ReactNode;
  className?: string;
};

export function LabeledField({ label, children, className }: Props) {
  return (
    <label className={cn("block text-xs", className)}>
      <span className="text-muted-foreground mb-1 block">{label}</span>
      {children}
    </label>
  );
}
