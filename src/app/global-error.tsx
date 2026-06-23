'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="ca">
      <body style={{ fontFamily: 'sans-serif', padding: 40, textAlign: 'center' }}>
        <h1>S’ha produït un error</h1>
        <p>Ho sentim. Torna-ho a provar o recarrega la pàgina.</p>
      </body>
    </html>
  );
}
