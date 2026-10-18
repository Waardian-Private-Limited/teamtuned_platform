import React from 'react';
import { cx } from '@/theme/tokens';

/**
 * Tiny markdown renderer for job descriptions: headings (#, ##, ###),
 * paragraphs, "-"/"*" bullets, "1." lists, **bold**, *italic* / _italic_.
 * Everything renders as React text nodes, so input is escaped by
 * construction (no HTML, no links, no dangerouslySetInnerHTML).
 */
function inline(text: string, keyBase: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|__[^_]+__|\*[^*\s][^*]*\*|_[^_\s][^_]*_)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const token = m[0];
    if (token.startsWith('**') || token.startsWith('__')) out.push(<strong key={`${keyBase}-${i++}`} className="font-semibold text-fg">{token.slice(2, -2)}</strong>);
    else out.push(<em key={`${keyBase}-${i++}`}>{token.slice(1, -1)}</em>);
    last = m.index + token.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

type Block =
  | { kind: 'h'; level: 1 | 2 | 3; text: string }
  | { kind: 'p'; lines: string[] }
  | { kind: 'ul' | 'ol'; items: string[] };

function parse(src: string): Block[] {
  const blocks: Block[] = [];
  let cur: Block | null = null;
  const flush = () => { if (cur) blocks.push(cur); cur = null; };
  for (const raw of src.replace(/\r\n?/g, '\n').split('\n')) {
    const line = raw.trimEnd();
    if (!line.trim()) { flush(); continue; }
    const h = /^(#{1,3})\s+(.*)$/.exec(line.trim());
    const ul = /^\s*[-*•]\s+(.*)$/.exec(line);
    const ol = /^\s*\d+[.)]\s+(.*)$/.exec(line);
    if (h) { flush(); blocks.push({ kind: 'h', level: h[1].length as 1 | 2 | 3, text: h[2] }); continue; }
    if (ul || ol) {
      const kind = ul ? 'ul' : 'ol';
      const text = (ul || ol)![1];
      if (!cur || cur.kind !== kind) { flush(); cur = { kind, items: [] }; }
      (cur as { items: string[] }).items.push(text);
      continue;
    }
    if (!cur || cur.kind !== 'p') { flush(); cur = { kind: 'p', lines: [] }; }
    (cur as { lines: string[] }).lines.push(line.trim());
  }
  flush();
  return blocks;
}

export function Markdown({ source, className, emptyLabel = 'Nothing to preview yet.' }: { source: string; className?: string; emptyLabel?: string }) {
  const blocks = parse(source || '');
  if (!blocks.length) return <p className={cx('text-xs text-fg-subtle', className)}>{emptyLabel}</p>;
  return (
    <div className={cx('space-y-2.5 text-sm leading-relaxed text-fg-muted', className)}>
      {blocks.map((b, i) => {
        const k = `b${i}`;
        if (b.kind === 'h') {
          const cls = b.level === 1 ? 'text-base font-bold text-fg' : b.level === 2 ? 'text-sm font-bold text-fg' : 'text-sm font-semibold text-fg';
          return <p key={k} className={cx(cls, 'pt-1')}>{inline(b.text, k)}</p>;
        }
        if (b.kind === 'p') {
          return (
            <p key={k}>
              {b.lines.map((l, j) => (
                <React.Fragment key={j}>{j > 0 && <br />}{inline(l, `${k}-${j}`)}</React.Fragment>
              ))}
            </p>
          );
        }
        const List = b.kind === 'ul' ? 'ul' : 'ol';
        return (
          <List key={k} className={cx('space-y-1 pl-5', b.kind === 'ul' ? 'list-disc' : 'list-decimal')}>
            {b.items.map((it, j) => <li key={j}>{inline(it, `${k}-${j}`)}</li>)}
          </List>
        );
      })}
    </div>
  );
}
