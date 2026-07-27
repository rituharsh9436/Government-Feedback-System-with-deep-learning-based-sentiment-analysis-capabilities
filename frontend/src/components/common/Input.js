import { forwardRef } from 'react';

export const Input = forwardRef(({ label, error, className = '', ...props }, ref) => {
  return (
    <div className={`form-group ${className}`}>
      {label && <label className="form-label">{label}</label>}
      <input 
        ref={ref}
        className="form-input"
        {...props}
      />
      {error && <span className="text-danger text-sm mt-1">{error}</span>}
    </div>
  );
});

Input.displayName = 'Input';
