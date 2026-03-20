interface StepDotsProps {
  current: number;
  total: number;
}

export function StepDots({ current, total }: StepDotsProps) {
  return (
    <div className="flex items-center justify-center gap-1.5 mb-5">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={`rounded-full transition-all ${
            i + 1 === current
              ? 'w-5 h-1.5 bg-emerald-400'
              : i + 1 < current
              ? 'w-1.5 h-1.5 bg-emerald-600'
              : 'w-1.5 h-1.5 bg-white/10'
          }`}
        />
      ))}
    </div>
  );
}
