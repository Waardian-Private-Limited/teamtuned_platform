'use client';

export function LeaveEmptyState({ title, text, action }: { title: string; text: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
      <div className="mb-4 w-32 select-none sm:w-40 2xl:w-56">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/vectors/leaves.svg" alt="" className="h-auto w-full object-contain" />
      </div>
      <h3 className="text-base font-bold tracking-tight text-fg 2xl:text-xl">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-fg-muted">{text}</p>
      {action}
    </div>
  );
}
