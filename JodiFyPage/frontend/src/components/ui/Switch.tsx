interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
}

export function Switch({ checked, onChange, label, description }: SwitchProps) {
  return (
    <label className="jf-switch-row">
      <span className="jf-switch-text">
        <span className="jf-switch-label">{label}</span>
        {description && <span className="jf-switch-desc">{description}</span>}
      </span>
      <input
        type="checkbox"
        className="jf-switch-input"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        aria-label={label}
      />
      <span className="jf-switch" aria-hidden="true" />
    </label>
  );
}
