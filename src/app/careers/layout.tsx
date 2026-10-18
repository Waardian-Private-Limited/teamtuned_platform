// Public careers area (no login): candidates browse jobs, apply, take a test
// or answer an offer. No authenticated shell here — the root layout only adds
// providers, which render nothing for a signed-out visitor.
export default function CareersLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
