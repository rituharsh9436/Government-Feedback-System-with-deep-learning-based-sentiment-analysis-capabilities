import { cn } from "../../utils";

export const Badge = ({ children, variant = 'default', className = '', ...props }) => {
  const variants = {
    default: "bg-slate-100 text-slate-800 border-slate-200",
    primary: "bg-primary text-primary-foreground border-transparent",
    success: "bg-success-light text-success border-success-border",
    warning: "bg-warning-light text-warning border-warning-border",
    destructive: "bg-destructive-light text-destructive border-destructive-border",
    outline: "text-slate-700 border-slate-300",
  };

  return (
    <div 
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
