"use client";

import { useFormStatus } from "react-dom";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  pendingText?: string;
  confirmText?: string;
  /** For forms submitted via onSubmit (useFormStatus does not see those). */
  busy?: boolean;
};

/** Submit button that disables itself while pending and can ask for confirmation. */
export function SubmitButton({ children, pendingText, confirmText, className, onClick, disabled, busy, ...rest }: Props) {
  const status = useFormStatus();
  const pending = status.pending || Boolean(busy);
  const mine = busy || !rest.name || status.data?.get(rest.name) === rest.value;
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
