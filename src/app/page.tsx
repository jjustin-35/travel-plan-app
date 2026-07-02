export default function RootPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-16">
      <section className="mx-auto max-w-3xl rounded-3xl border border-border bg-card p-8 shadow-sm sm:p-12">
        <p className="mb-4 text-sm font-semibold uppercase tracking-[0.3em] text-coral">
          Travel Plan App
        </p>
        <h1 className="text-4xl font-bold tracking-tight text-charcoal sm:text-5xl">
          Plan warm, memorable trips with AI.
        </h1>
        <p className="mt-6 text-lg leading-8 text-muted">
          The product shell is ready. Authentication and trip-planning flows can
          now be connected without sending visitors to a missing route.
        </p>
      </section>
    </main>
  );
}
