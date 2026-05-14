const blockedTags = /<\/?(script|iframe|object|embed|link|meta|style|form|input|button)[^>]*>/gi;
const inlineHandlers = /\son\w+=(?:"[^"]*"|'[^']*'|[^\s>]+)/gi;
const javascriptUrls = /\s(href|src)=(?:"javascript:[^"]*"|'javascript:[^']*'|javascript:[^\s>]+)/gi;

export function sanitizeEmailHtml(html: string) {
  return html.replace(blockedTags, "").replace(inlineHandlers, "").replace(javascriptUrls, "");
}
