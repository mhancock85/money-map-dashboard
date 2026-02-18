import { LoginForm } from "@/components/auth/LoginForm";

interface LoginPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

function getSafeNextPath(rawNext: string | string[] | undefined) {
  const value = Array.isArray(rawNext) ? rawNext[0] : rawNext;

  if (!value || !value.startsWith("/")) {
    return "/";
  }

  return value;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const resolvedSearchParams = await searchParams;
  const nextPath = getSafeNextPath(resolvedSearchParams?.next);
  const errorType = resolvedSearchParams?.error as string | undefined;
  const errorDetail = resolvedSearchParams?.detail as string | undefined;

  return (
    <main className="min-h-screen bg-forest text-white flex items-center justify-center px-6">
      <section className="w-full max-w-md glass-card p-8">
        <h1 className="text-3xl font-bold mb-2">Sign in</h1>
        <p className="text-slate-400 mb-8">Use your Money Map account email to access the dashboard.</p>
        {errorType && (
          <div className="text-orange-400 text-sm mb-4 p-3 bg-orange-400/10 rounded-lg">
            <p>Sign-in link expired or was already used. Please request a new link below.</p>
            {errorDetail && (
              <p className="mt-1 text-xs text-orange-400/70 font-mono">{errorType}: {errorDetail}</p>
            )}
          </div>
        )}
        <LoginForm nextPath={nextPath} />
      </section>
    </main>
  );
}

