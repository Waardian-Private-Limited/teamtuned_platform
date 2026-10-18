// A deliberately tiny markdown renderer for job descriptions written by
// recruiters. It builds React elements, so every piece of text goes through
// React's own escaping — no dangerouslySetInnerHTML, no HTML passthrough.
// Supports: # headings, paragraphs, - / * / + bullet lists, 1. ordered lists,
// **bold**, *italic* / _italic_, `code`, [links](https://…) (http/https/mailto only).
import { Fragment, type ReactNode } from 'react';

type Block =
  | { kind: 'heading'; level: number; text: string }
  | { kind: 'paragraph'; text: string }
  | { kind: 'ul' | 'ol'; items: string[] }
  | { kind: 'hr' };

function parseBlocks(src: string): Block[] {
  const lines = src.replace(/\r\n?/g, '\n').split('\n');
  const blocks: Block[] = [];
  let para: string[] = [];
  let list: { kind: 'ul' | 'ol'; items: string[] } | null = null;

  const flushPara = () => {
    if (para.length) blocks.push({ kind: 'paragraph', text: para.join(' ') });
    para = [];
  };
  const flushList = () => {
    if (list) blocks.push(list);
    list = null;
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      flushPara();
      flushList();
      continue;
    }
    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      flushPara();
      flushList();
      blocks.push({ kind: 'heading', level: heading[1].length, text: heading[2].replace(/\s+#+\s*$/, '') });
      continue;
    }
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line)) {
      flushPara();
      flushList();
      blocks.push({ kind: 'hr' });
      continue;
    }
    const bullet = /^[-*+•]\s+(.*)$/.exec(line);
    const ordered = /^\d+[.)]\s+(.*)$/.exec(line);
    if (bullet || ordered) {
      flushPara();
      const kind = bullet ? 'ul' : 'ol';
      if (!list || list.kind !== kind) {
        flushList();
        list = { kind, items: [] };
      }
      list.items.push((bullet ?? ordered)![1]);
      continue;
    }
    if (list && /^\s{2,}/.test(rawLine)) {
      // Indented continuation of the previous list item.
      list.items[list.items.length - 1] += ` ${line}`;
      continue;
    }
    flushList();
    para.push(line);
  }
  flushPara();
  flushList();
  return blocks;
}

const INLINE = /(\*\*[^*]+?\*\*|__[^_]+?__|\*[^*\s][^*]*?\*|_[^_\s][^_]*?_|`[^`]+?`|\[[^\]]+?\]\([^)\s]+?\))/g;

function safeHref(url: string): string | null {
  const trimmed = url.trim();
  if (/^mailto:[^\s]+$/i.test(trimmed)) return trimmed;
  try {
    const u = new URL(trimmed);
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.toString() : null;
  } catch {
    return null;
  }
}

function renderInline(text: string, keyPrefix = 'i'): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let i = 0;
  for (const match of text.matchAll(INLINE)) {
    const token = match[0];
    const start = match.index ?? 0;
    if (start > last) out.push(text.slice(last, start));
    const key = `${keyPrefix}-${i++}`;
    if (token.startsWith('**') || token.startsWith('__')) {
      out.push(<strong key={key} className="font-semibold text-fg">{renderInline(token.slice(2, -2), key)}</strong>);
    } else if (token.startsWith('`')) {
      out.push(<code key={key} className="rounded bg-bg-subtle px-1 py-0.5 text-[0.9em] text-fg">{token.slice(1, -1)}</code>);
    } else if (token.startsWith('[')) {
      const m = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(token);
      const href = m ? safeHref(m[2]) : null;
      if (m && href) {
        out.push(
          <a key={key} href={href} target="_blank" rel="noopener noreferrer nofollow" className="font-medium text-fg underline underline-offset-4 hover:opacity-70">
            {renderInline(m[1], key)}
          </a>
        );
      } else {
        out.push(m ? m[1] : token);
      }
    } else {
      out.push(<em key={key}>{renderInline(token.slice(1, -1), key)}</em>);
    }
    last = start + token.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

const HEADING_CLASS: Record<number, string> = {
  1: 'mt-8 text-xl font-bold text-fg',
  2: 'mt-8 text-lg font-semibold text-fg',
  3: 'mt-6 text-base font-semibold text-fg',
};

export function Markdown({ source }: { source: string }) {
  const blocks = parseBlocks(source);
  return (
    <div className="text-[15px] leading-7 text-fg-muted [&>*:first-child]:mt-0 break-words">
      {blocks.map((b, idx) => {
        const key = `b-${idx}`;
        switch (b.kind) {
          case 'heading': {
            const cls = HEADING_CLASS[b.level] ?? 'mt-5 text-sm font-semibold uppercase tracking-wide text-fg';
            const content = renderInline(b.text, key);
            // Page already owns h1; description headings start at h2.
            if (b.level <= 1) return <h2 key={key} className={cls}>{content}</h2>;
            if (b.level === 2) return <h3 key={key} className={cls}>{content}</h3>;
            return <h4 key={key} className={cls}>{content}</h4>;
          }
          case 'paragraph':
            return <p key={key} className="mt-4">{renderInline(b.text, key)}</p>;
          case 'hr':
            return <hr key={key} className="my-6 border-line" />;
          case 'ul':
          case 'ol': {
            const ListTag = b.kind === 'ul' ? 'ul' : 'ol';
            return (
              <ListTag key={key} className={b.kind === 'ul' ? 'mt-4 list-disc space-y-1.5 pl-5 marker:text-fg-subtle' : 'mt-4 list-decimal space-y-1.5 pl-5 marker:text-fg-subtle'}>
                {b.items.map((item, j) => (
                  <li key={j} className="pl-1">
                    <Fragment>{renderInline(item, `${key}-${j}`)}</Fragment>
                  </li>
                ))}
              </ListTag>
            );
          }
        }
      })}
    </div>
  );
}
