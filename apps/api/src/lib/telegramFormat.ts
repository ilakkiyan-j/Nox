/**
 * Telegram Markdown-to-HTML Formatter
 * Formats standard AI markdown into Telegram-compliant HTML tags.
 * Telegram supports: <b>, <i>, <s>, <u>, <code>, <pre>, <a href="...">
 */

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function formatMarkdownForTelegram(markdown: string): string {
  if (!markdown) return '';

  let text = markdown;

  // 1. Preserve and format Code Blocks: ```lang\ncode\n```
  const codeBlocks: string[] = [];
  text = text.replace(/```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g, (_match, _lang, code) => {
    const token = `XCODEBLOCKTOKEN${codeBlocks.length}X`;
    codeBlocks.push(`<pre><code>${escapeHtml(code.trim())}</code></pre>`);
    return token;
  });

  // 2. Preserve and format Inline Code: `code`
  const inlineCodes: string[] = [];
  text = text.replace(/`([^`\n]+)`/g, (_match, code) => {
    const token = `XINLINETOKEN${inlineCodes.length}X`;
    inlineCodes.push(`<code>${escapeHtml(code)}</code>`);
    return token;
  });

  // 3. Escape general HTML entities in normal body text
  text = escapeHtml(text);

  // 4. Convert Headings (#, ##, ###, ####) to <b>Title</b>
  text = text.replace(/^#{1,6}\s+(.+)$/gm, '<b>$1</b>\n');

  // 5. Convert bullet lists (* item, - item) to • item BEFORE italic conversion!
  text = text.replace(/^[\*\-]\s+(.+)$/gm, '• $1');

  // 6. Convert Bold: **text** or __text__
  text = text.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
  text = text.replace(/__(.+?)__/g, '<b>$1</b>');

  // 7. Convert Italic: *text* or _text_
  text = text.replace(/(?<![a-zA-Z0-9])\*([^*]+?)\*(?![a-zA-Z0-9])/g, '<i>$1</i>');
  text = text.replace(/(?<![a-zA-Z0-9])_([^_]+?)_(?![a-zA-Z0-9])/g, '<i>$1</i>');

  // 8. Convert Strikethrough: ~~text~~
  text = text.replace(/~~(.+?)~~/g, '<s>$1</s>');

  // 9. Convert Markdown Links: [label](url)
  text = text.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2">$1</a>');

  // 10. Restore Code Blocks and Inline Codes
  codeBlocks.forEach((block, idx) => {
    text = text.replace(`XCODEBLOCKTOKEN${idx}X`, block);
  });
  inlineCodes.forEach((code, idx) => {
    text = text.replace(`XINLINETOKEN${idx}X`, code);
  });

  // 11. Normalize excess newlines (max 2 consecutive newlines)
  text = text.replace(/\n{3,}/g, '\n\n');

  return text.trim();
}

/**
 * Sends a Telegram reply with HTML formatting, with automatic fallback to plain text
 */
export async function sendTelegramFormattedReply(
  botToken: string,
  chatId: number | string,
  rawText: string,
  additionalParams: Record<string, any> = {}
): Promise<{ ok: boolean; result?: any; error?: string }> {
  const formattedHtml = formatMarkdownForTelegram(rawText);

  // 1. Try sending with parse_mode: HTML
  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: formattedHtml,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
        ...additionalParams,
      }),
    });

    const data = (await res.json()) as any;
    if (data?.ok) {
      return { ok: true, result: data.result };
    }

    console.warn('[Telegram HTML Send Warning]', data?.description || 'HTML parse error, falling back to plain text');
  } catch (err: any) {
    console.warn('[Telegram HTML Send Failed]', err?.message);
  }

  // 2. Fallback: Send plain sanitized text if HTML parse failed
  try {
    const plainRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: rawText,
        disable_web_page_preview: true,
        ...additionalParams,
      }),
    });
    const plainData = (await plainRes.json()) as any;
    return { ok: Boolean(plainData?.ok), result: plainData?.result, error: plainData?.description };
  } catch (fallbackErr: any) {
    console.error('[Telegram Plain Text Fallback Failed]', fallbackErr);
    return { ok: false, error: fallbackErr?.message };
  }
}
