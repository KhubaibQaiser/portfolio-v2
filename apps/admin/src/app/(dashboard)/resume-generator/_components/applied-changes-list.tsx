"use client";

type Props = {
  changes: string[];
};

export function AppliedChangesList({ changes }: Props) {
  if (changes.length === 0) return null;
  return (
    <div className="border-border/60 bg-muted/10 rounded-lg border p-3">
      <h3 className="text-accent text-xs font-semibold tracking-wider uppercase">
        Applied changes
      </h3>
      <ul className="mt-2 list-disc space-y-1 pl-4 text-xs">
        {changes.map((change) => (
          <li key={change}>{change}</li>
        ))}
      </ul>
    </div>
  );
}
