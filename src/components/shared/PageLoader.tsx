export default function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-[var(--brand)] border-t-transparent rounded-full animate-spin" />
        <p className="text-[var(--text-secondary)] text-sm">جاري التحميل...</p>
      </div>
    </div>
  );
}
