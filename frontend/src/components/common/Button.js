export const Button = ({ children, variant = 'primary', className = '', isLoading = false, ...props }) => {
  return (
    <button 
      className={`btn btn-${variant} ${className}`} 
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading ? 'Loading...' : children}
    </button>
  );
};
