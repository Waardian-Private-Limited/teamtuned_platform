'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { Section } from '@/components/ui/FormControls';
import { API_BASE_URL } from '@/config/env';
import { cx } from '@/theme/tokens';
import { btn } from '../../interviews/lib/ui';
import { useCopy } from './ApiKeysPanel';
import { careersSnippets } from './integrationSnippets';

const KEY = 'tt_live_xxxxxxxxxxxxxxxx';

export function IntegrationPanel() {
  const base = API_BASE_URL.replace(/\/+$/, '');
  const list = careersSnippets(base, KEY);
  const [tab, setTab] = useState(list[0].key);
  const { copied, copy } = useCopy();
  const current = list.find((s) => s.key === tab) || list[0];

  return (
    <Section title="Integration" description="Show jobs and take applications on your own website with a key from above.">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div role="tablist" aria-label="Snippets" className="flex flex-wrap gap-1">
            {list.map((s) => (
              <button
                key={s.key}
                type="button"
                role="tab"
                aria-selected={tab === s.key}
                onClick={() => setTab(s.key)}
                className={cx('h-8 rounded-lg px-2.5 text-xs font-semibold transition-colors', tab === s.key ? 'bg-fg text-[var(--tt-on-primary)]' : 'text-fg-muted hover:bg-bg-subtle hover:text-fg')}
              >
                {s.label}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => copy(current.key, current.code)} className={btn.small}>
            {copied === current.key ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied === current.key ? 'Copied' : 'Copy'}
          </button>
        </div>
        <pre className="max-h-[420px] overflow-auto rounded-lg border border-line bg-bg-subtle p-3 font-mono text-[11px] leading-relaxed text-fg sm:text-xs">
          <code>{current.code}</code>
        </pre>
        <ul className="list-disc space-y-1 pl-5 text-xs text-fg-muted">
          <li>
            <span className="font-semibold text-fg">Build the apply form from the job.</span> Each job returns its application form
            (<code className="font-mono">form.fields</code>, <code className="font-mono">form.resume</code>, <code className="font-mono">form.questions</code>).
            The JavaScript example renders it, so fields and questions HR adds to a position later show up on your site without code
            changes. A hand-written form stops working when HR makes a new field required.
          </li>
          <li>Base URL: <code className="font-mono text-fg">{base}/public/careers</code></li>
          <li>Applications require <code className="font-mono">consent=true</code> and an empty <code className="font-mono">website</code> field; requests are rate limited per IP and key.</li>
          <li>Re-applying to the same job answers <code className="font-mono">already_applied</code> and never overwrites the first application.</li>
        </ul>
      </div>
    </Section>
  );
}
