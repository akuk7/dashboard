import DOMPurify from 'dompurify';
import { marked } from 'marked';

// Entries written before the rich editor are markdown; new ones are HTML. Both live in content_html.
const looksLikeHtml = (s: string) => /^\s*<(p|h[1-6]|ul|ol|table|blockquote|pre|img|div|hr)[\s>/]/i.test(s);

export function sanitize(html: string): string {
  return DOMPurify.sanitize(html);
}

/** HTML ready for the editor/viewer, converting legacy markdown on the fly. */
export function toHtml(content: string): string {
  if (!content.trim()) return '';
  const html = looksLikeHtml(content) ? content : (marked.parse(content, { gfm: true, async: false }) as string);
  return sanitize(html);
}

export function toPlainText(content: string): string {
  const doc = new DOMParser().parseFromString(toHtml(content), 'text/html');
  return (doc.body.textContent || '').replace(/\s+/g, ' ').trim();
}

/** True when the HTML has no text and no image/table. */
export function isEmptyContent(html: string): boolean {
  if (/<(img|table)[\s>]/i.test(html)) return false;
  return toPlainText(html).length === 0;
}
