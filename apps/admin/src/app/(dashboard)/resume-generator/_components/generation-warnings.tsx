type GenerationWarningsProps = {
  warnings: string[];
};

export function GenerationWarnings({ warnings }: GenerationWarningsProps) {
  if (warnings.length === 0) return null;

  return (
    <div
      className="border-c-border-muted bg-c-background text-c-card-muted rounded-lg border px-3 py-2 text-sm"
      role="status"
    >
      <p className="text-accent font-medium dark:text-white">Review notes</p>
      <ul className="mt-1 list-disc space-y-1 pl-4">
        {warnings.map((warning) => (
          <li key={warning}>{warning}</li>
        ))}
      </ul>
    </div>
  );
}
