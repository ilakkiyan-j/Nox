'use client';

import React from 'react';

interface MarkdownRendererProps {
  content: string;
  accentColor?: string; // 'rose' | 'cyan' | 'amber'
}

export default function MarkdownRenderer({ content, accentColor = 'rose' }: MarkdownRendererProps) {
  if (!content) return null;

  // Split content into blocks by double newlines or lines
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeBlockContent: string[] = [];
  let codeBlockLang = '';
  let inList = false;
  let listItems: string[] = [];
  let isNumberedList = false;
  let tableRows: string[][] = [];
  let inTable = false;

  const flushList = (key: number) => {
    if (listItems.length === 0) return null;
    const ListTag = isNumberedList ? 'ol' : 'ul';
    const comp = (
      <ListTag
        key={`list-${key}`}
        className={`my-2 space-y-1 pl-4 ${isNumberedList ? 'list-decimal' : 'list-disc'} text-slate-700 dark:text-slate-300 leading-relaxed text-xs`}
      >
        {listItems.map((item, idx) => (
          <li key={idx} className="pl-1">
            {formatInlineText(item, accentColor)}
          </li>
        ))}
      </ListTag>
    );
    listItems = [];
    inList = false;
    return comp;
  };

  const flushTable = (key: number) => {
    if (tableRows.length === 0) return null;
    const header = tableRows[0];
    const rows = tableRows.slice(1);
    const comp = (
      <div key={`table-${key}`} className="my-2.5 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
        <table className="w-full text-left border-collapse text-[11px]">
          <thead>
            <tr className="bg-slate-100/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-bold">
              {header.map((col, idx) => (
                <th key={idx} className="p-2 whitespace-nowrap">
                  {formatInlineText(col.trim(), accentColor)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/60 dark:divide-slate-700/60">
            {rows.map((row, rIdx) => (
              <tr key={rIdx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                {row.map((cell, cIdx) => (
                  <td key={cIdx} className="p-2 text-slate-700 dark:text-slate-300">
                    {formatInlineText(cell.trim(), accentColor)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
    tableRows = [];
    inTable = false;
    return comp;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Code Block Start/End
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        // End code block
        elements.push(
          <div
            key={`code-${i}`}
            className="my-2 rounded-xl bg-slate-900 dark:bg-slate-950 text-slate-100 p-3 text-[11px] font-mono overflow-x-auto border border-slate-800 shadow-xs"
          >
            {codeBlockLang && (
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block mb-1">
                {codeBlockLang}
              </span>
            )}
            <pre className="whitespace-pre">{codeBlockContent.join('\n')}</pre>
          </div>
        );
        codeBlockContent = [];
        codeBlockLang = '';
        inCodeBlock = false;
      } else {
        // Start code block
        if (inList) elements.push(flushList(i));
        if (inTable) elements.push(flushTable(i));
        inCodeBlock = true;
        codeBlockLang = line.trim().replace('```', '').trim();
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockContent.push(line);
      continue;
    }

    // Table Row detection (e.g. | col 1 | col 2 |)
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      if (inList) elements.push(flushList(i));
      // Ignore divider rows like |---|---|
      if (line.includes('---')) {
        continue;
      }
      const cells = line.split('|').slice(1, -1);
      inTable = true;
      tableRows.push(cells);
      continue;
    } else if (inTable) {
      elements.push(flushTable(i));
    }

    // List Item detection (- , * , 1. )
    const bulletMatch = line.match(/^(\s*)([-*]|\d+\.)\s+(.+)$/);
    if (bulletMatch) {
      const isNum = /^\d+\./.test(bulletMatch[2]);
      if (!inList || isNumberedList !== isNum) {
        if (inList) elements.push(flushList(i));
        inList = true;
        isNumberedList = isNum;
      }
      listItems.push(bulletMatch[3]);
      continue;
    } else if (inList) {
      elements.push(flushList(i));
    }

    // Empty line
    if (!line.trim()) {
      elements.push(<div key={`space-${i}`} className="h-2" />);
      continue;
    }

    // Horizontal Rule
    if (line.trim() === '---' || line.trim() === '***') {
      elements.push(<hr key={`hr-${i}`} className="my-3 border-slate-200 dark:border-slate-700" />);
      continue;
    }

    // Headings
    if (line.startsWith('### ')) {
      elements.push(
        <h4 key={`h4-${i}`} className="font-display font-extrabold text-xs text-slate-900 dark:text-slate-100 mt-2.5 mb-1">
          {formatInlineText(line.replace('### ', ''), accentColor)}
        </h4>
      );
      continue;
    }
    if (line.startsWith('## ')) {
      elements.push(
        <h3 key={`h3-${i}`} className="font-display font-black text-sm text-slate-900 dark:text-slate-100 mt-3 mb-1.5">
          {formatInlineText(line.replace('## ', ''), accentColor)}
        </h3>
      );
      continue;
    }
    if (line.startsWith('# ')) {
      elements.push(
        <h2 key={`h2-${i}`} className="font-display font-black text-base text-slate-900 dark:text-slate-100 mt-3 mb-1.5">
          {formatInlineText(line.replace('# ', ''), accentColor)}
        </h2>
      );
      continue;
    }

    // Blockquote
    if (line.startsWith('> ')) {
      elements.push(
        <blockquote
          key={`quote-${i}`}
          className="my-2 pl-3 py-1 border-l-2 border-rose-400 dark:border-rose-500 bg-rose-50/40 dark:bg-rose-950/20 text-slate-700 dark:text-slate-300 italic text-xs rounded-r-lg"
        >
          {formatInlineText(line.replace('> ', ''), accentColor)}
        </blockquote>
      );
      continue;
    }

    // Standard Paragraph
    elements.push(
      <p key={`p-${i}`} className="leading-relaxed text-xs text-slate-800 dark:text-slate-200">
        {formatInlineText(line, accentColor)}
      </p>
    );
  }

  if (inList) elements.push(flushList(lines.length));
  if (inTable) elements.push(flushTable(lines.length));

  return <div className="space-y-1.5 text-xs">{elements}</div>;
}

/**
 * Parses inline markdown: **bold**, *italic*, `code`
 */
function formatInlineText(text: string, _accentColor: string): React.ReactNode {
  // Regex to match bold, italic, code
  const parts = text.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`)/g);

  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={index} className="font-bold text-slate-900 dark:text-slate-100">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return (
        <em key={index} className="italic text-slate-700 dark:text-slate-300">
          {part.slice(1, -1)}
        </em>
      );
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code
          key={index}
          className="px-1.5 py-0.5 rounded bg-slate-200/80 dark:bg-slate-700/80 text-[10px] font-mono text-slate-800 dark:text-slate-200"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}
