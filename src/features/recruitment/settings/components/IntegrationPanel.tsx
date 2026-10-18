'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { Section } from '@/components/ui/FormControls';
import { API_BASE_URL } from '@/config/env';
import { cx } from '@/theme/tokens';
import { btn } from '../../interviews/lib/ui';
import { useCopy } from './ApiKeysPanel';

const KEY = 'tt_live_xxxxxxxxxxxxxxxx';

function snippets(base: string) {
  const jobs = `${base}/public/careers/jobs`;
  return [
    {
      key: 'list',
      label: 'List jobs (curl)',
      code: `curl "${jobs}?search=&department=&location=&page=1" \\
  -H "X-Careers-Key: ${KEY}"`,
    },
    {
      key: 'detail',
      label: 'Job detail (curl)',
      code: `curl "${jobs}/<jobSlug>" \\
  -H "X-Careers-Key: ${KEY}"`,
    },
    {
      key: 'js',
      label: 'Website (JavaScript)',
      code: `const API = "${jobs}";
const KEY = "${KEY}"; // publishable: reads published jobs, submits applications

// 1. List open jobs
const res = await fetch(\`\${API}?page=1\`, { headers: { "X-Careers-Key": KEY } });
const { company, items, page, pages } = await res.json();
// items: [{ slug, title, department, location, workMode, employmentType,
//           experience: { min, max }, salary: { min, max } | null, closesOn, postedAt }]

// 2. Job detail (description, skills, application form)
const job = await (await fetch(\`\${API}/\${slug}\`, { headers: { "X-Careers-Key": KEY } })).json();

// 3. Apply (multipart; do not set Content-Type yourself)
const form = new FormData();
form.append("first_name", "Asha");
form.append("last_name", "Rao");
form.append("email", "asha@example.com");
form.append("phone", "+91 98765 43210");
// standard fields the job's form turns on, e.g. city, experience, current_company,
// notice_period, current_ctc, expected_ctc, linkedin, portfolio
form.append("answers", JSON.stringify({ /* [question.key]: value */ }));
form.append("consent", "true");
form.append("website", ""); // honeypot: must stay empty
form.append("resume", fileInput.files[0]); // pdf / doc / docx, max 5 MB

const apply = await fetch(\`\${API}/\${slug}/applications\`, {
  method: "POST",
  headers: { "X-Careers-Key": KEY },
  body: form,
});
const { status } = await apply.json(); // 201 "received" or 200 "already_applied"`,
    },
  ];
}

export function IntegrationPanel() {
  const base = API_BASE_URL.replace(/\/+$/, '');
  const list = snippets(base);
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
          <li>Base URL: <code className="font-mono text-fg">{base}/public/careers</code></li>
          <li>Applications require <code className="font-mono">consent=true</code> and an empty <code className="font-mono">website</code> field; requests are rate limited per IP and key.</li>
          <li>Re-applying to the same job answers <code className="font-mono">already_applied</code> and never overwrites the first application.</li>
        </ul>
      </div>
    </Section>
  );
}
