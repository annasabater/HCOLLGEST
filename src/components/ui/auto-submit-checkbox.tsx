'use client';

/**
 * Checkbox dins d'un <form method="get">: en canviar, envia el formulari tot
 * sol (com un filtre). Sense això, cal prémer a més el botó de cercar.
 */
export function AutoSubmitCheckbox(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      type="checkbox"
      onChange={(e) => {
        props.onChange?.(e);
        e.currentTarget.form?.requestSubmit();
      }}
    />
  );
}
