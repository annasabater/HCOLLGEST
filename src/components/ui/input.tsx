import * as React from 'react';
import { cn } from '@/lib/utils';

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  /** Converteix el text a MAJÚSCULES mentre s'escriu (visual + valor desat). */
  uppercase?: boolean;
};

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, uppercase, onChange, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900',
        'placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200',
        'disabled:cursor-not-allowed disabled:bg-slate-50',
        uppercase && 'uppercase placeholder:normal-case',
        className,
      )}
      onChange={
        uppercase && onChange
          ? (e) => {
              e.target.value = e.target.value.toUpperCase();
              onChange(e);
            }
          : onChange
      }
      {...props}
    />
  ),
);
Input.displayName = 'Input';

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      'min-h-20 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900',
      'placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200',
      className,
    )}
    {...props}
  />
));
Textarea.displayName = 'Textarea';

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      'h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900',
      'focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200',
      className,
    )}
    {...props}
  >
    {children}
  </select>
));
Select.displayName = 'Select';
