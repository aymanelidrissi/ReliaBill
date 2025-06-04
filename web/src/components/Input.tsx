import { clsx } from 'clsx';

export function Input(
  props: React.InputHTMLAttributes<HTMLInputElement>,
) {
  return (
    <input
      className={clsx(
        'w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm',
        'focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600',
        props.className,
      )}
      {...props}
    />
  );
}
