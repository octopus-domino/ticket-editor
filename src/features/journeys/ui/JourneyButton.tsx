import type { ButtonHTMLAttributes } from 'react';
export function JourneyButton({
  variant = 'secondary',
  className = '',
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' }) {
  return (
    <button
      {...props}
      type={type}
      className={`journey-button journey-button--${variant} ${className}`}
    />
  );
}
