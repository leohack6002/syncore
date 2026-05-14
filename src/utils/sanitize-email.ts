const blockedTags = /<\/?(script|iframe|object|embed|link|meta|style)[^>]*>/gi;
const inlineHandlers = /\son\w+="[^"]*"/gi;

export function sanitizeEmailHtml(html: string) {
  return html.replace(blockedTags, "").replace(inlineHandlers, "");
}
