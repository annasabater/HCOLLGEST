import { Suspense } from 'react';
import { LoginForm } from './login-form';

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-900 to-brand-950 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center text-white">
          <h1 className="font-serif text-4xl font-semibold tracking-wide">Hostal Coll</h1>
          <p className="mt-2 text-xs uppercase tracking-[0.25em] text-brand-200">
            Gestió integral · PMS + ERP
          </p>
        </div>
        <div className="rounded-2xl bg-white p-6 shadow-xl">
          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>
        </div>
        <p className="mt-6 text-center text-xs text-brand-300">
          Accés restringit · totes les accions queden auditades
        </p>
      </div>
    </main>
  );
}
