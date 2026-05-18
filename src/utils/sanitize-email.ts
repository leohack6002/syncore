const blockedTagBlocks = /<(script|style|iframe|object|embed|form|button)\b[^>]*>[\s\S]*?<\/\1>/gi;
const blockedTags = /<\/?(script|iframe|object|embed|link|meta|style|form|input|button)[^>]*>/gi;
const inlineHandlers = /\son\w+=(?:"[^"]*"|'[^']*'|[^\s>]+)/gi;
const javascriptUrls = /\s(href|src)=(?:"javascript:[^"]*"|'javascript:[^']*'|javascript:[^\s>]+)/gi;

/**
 * Removes unsafe email HTML before rendering it inside the sandboxed reader iframe.
 */
export function sanitizeEmailHtml(html: string) {
  return html.replace(blockedTagBlocks, "").replace(blockedTags, "").replace(inlineHandlers, "").replace(javascriptUrls, "");
}
