export function SkeletonLoader({ className = '' }: { className?: string }) {
  return (
    <div className={`skeleton-shimmer rounded-lg ${className}`} />
  );
}
