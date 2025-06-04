import { clsx } from 'clsx';

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline';
}

export function Button({
  variant = 'primary',
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      className={clsx(
        'inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition',
        variant === 'primary'
          ? 'bg-blue-600 text-white hover:bg-blue-700'
          : 'border border-gray-300 text-gray-700 hover:bg-gray-50',
        className,
      )}
      {...props}
    />
  );
}
