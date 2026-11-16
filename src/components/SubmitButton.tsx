"use client";

import { useFormStatus } from "react-dom";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  pendingText?: string;
  confirmText?: string;
};

/** Submit button that disables itself while pending and can ask for confirmation. */
export function SubmitButton({ children, pendingText, confirmText, className, onClick, disabled, ...rest }: Props) {
  const { pending, data } = useFormStatus();
  const mine = !rest.name || data?.get(rest.name) === rest.value;
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className={className ?? "btn bg-gray-900 hover:bg-gray-800"}
      onClick={(e) => {
        if (confirmText && !window.confirm(confirmText)) e.preventDefault();
        onClick?.(e);
      }}
      {...rest}
    >
      {pending && mine ? (pendingText ?? "Palaukite…") : children}
    </button>
  );
}
