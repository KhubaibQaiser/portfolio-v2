type Props = {
  label: string;
  value: string;
  sub?: string;
};

export function UsageStat({ label, value, sub }: Props) {
  return (
    <div className="border-border/60 bg-muted/20 rounded-lg border px-3 py-2 text-left">
      <p className="text-muted-foreground text-[10px] tracking-wider uppercase">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-semibold">{value}</p>
      {sub && <p className="text-muted-foreground text-[10px]">{sub}</p>}
    </div>
  );
}
