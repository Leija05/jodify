interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
}

export function Switch({ checked, onChange, label, description, disabled = false }: SwitchProps) {
  return (
    <label className={`jf-switch-row ${disabled ? 'is-disabled' : ''}`} style={disabled ? { opacity: 0.6, cursor: 'not-allowed' } : undefined}>
      {label && (
        <span className="jf-switch-text">
          <span className="jf-switch-label">{label}</span>
          {description && <span className="jf-switch-desc">{description}</span>}
        </span>
      )}
      <input
        type="checkbox"
        className="jf-switch-input"
        checked={checked}
        disabled={disabled}
        onChange={(e) => {
          if (!disabled) {
            onChange(e.target.checked);
          }
        }}
        aria-label={label || 'Interruptor'}
      />
      <span className="jf-switch" aria-hidden="true" />
    </label>
  );
}
