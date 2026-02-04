import type { ReactNode, ButtonHTMLAttributes } from 'react';

interface ButtonProps {
  onClick?: () => void;
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
}

export const Button: React.FC<ButtonProps> = ({
  onClick,
  children,
  variant = 'primary',
  disabled = false,
  type = 'button',
  className = '',
}) => {
  const baseStyles = 'px-4 py-2 font-medium text-sm rounded transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed';

  const variantStyles = {
    primary: 'bg-black text-white hover:bg-gray-800 active:bg-gray-900',
    secondary: 'bg-white text-black border border-gray-300 hover:bg-gray-50 active:bg-gray-100',
    danger: 'bg-black text-white hover:bg-red-900 active:bg-red-950',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${variantStyles[variant]} ${className}`}
    >
      {children}
    </button>
  );
};
