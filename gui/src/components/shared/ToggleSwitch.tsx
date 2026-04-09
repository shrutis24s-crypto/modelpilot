interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  accentColor?: string;
}

export function ToggleSwitch({ checked, onChange, accentColor }: ToggleSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-[22px] w-[40px] shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
        checked ? '' : 'bg-border-bright'
      }`}
      style={checked ? { backgroundColor: accentColor ?? 'hsl(192 100% 61%)' } : undefined}
    >
      <span
        className={`pointer-events-none block h-[18px] w-[18px] rounded-full shadow-lg transition-transform duration-200 ${
          checked ? 'translate-x-[18px]' : 'translate-x-0'
        }`}
        style={{ backgroundColor: '#fff' }}
      />
    </button>
  );
}
