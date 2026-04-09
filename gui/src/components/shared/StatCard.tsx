import { useCountUp } from '@/hooks/useCountUp';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: number;
  suffix?: string;
  icon: LucideIcon;
}

export function StatCard({ label, value, suffix, icon: Icon }: StatCardProps) {
  const display = useCountUp(value, 1200);

  return (
    <div
      className="rounded-md p-5 group transition-all duration-200 hover:-translate-y-[1px]"
      style={{
        borderTop: '1px solid #39D0FF',
        border: '1px solid hsl(213 14% 15%)',
        borderTopColor: '#39D0FF',
        boxShadow: '0 0 30px rgba(57, 208, 255, 0.06), inset 0 1px 0 rgba(57, 208, 255, 0.1)',
        background: 'linear-gradient(135deg, #0D1117 0%, #0F1923 100%)',
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-body font-medium text-muted-foreground">{label}</span>
        <Icon size={14} className="text-muted-foreground/50" />
      </div>
      <div
        className="font-body text-2xl font-semibold tracking-tight"
        style={{ color: '#39D0FF', textShadow: '0 0 30px rgba(57, 208, 255, 0.4)' }}
      >
        {display}{suffix}
      </div>
    </div>
  );
}
