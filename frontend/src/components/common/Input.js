import { forwardRef } from 'react';
import { cn } from "../../utils";

export const Input = forwardRef(({ label, error, hint, className = '', ...props }, ref) => {
  return (
    <div className="flex flex-col space-y-1.5 w-full">
      {label && <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-slate-700">{label}</label>}
      <input 
        ref={ref}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-50",
          error && "border-destructive focus-visible:ring-destructive",
          className
        )}
        {...props}
      />
      {error && <span className="text-destructive text-xs font-medium">{error}</span>}
      {!error && hint && <span className="text-xs text-slate-500">{hint}</span>}
    </div>
  );
});

Input.displayName = 'Input';
