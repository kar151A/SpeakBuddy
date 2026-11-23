// Interpret sentence-opening reactions only. Preserve units, quotations and lesson examples.
export function speechText(text, expressive = false) {
  return text.replace(/(^|[.!?] +)((?:(?:h?m{2,}|u+m+|a{2,}h*|ah+)(?:[,….!—-]+\s*|\s+(?=$)))+)/gi,
    (_, boundary, reaction) => {
      const direction = /^a/i.test(reaction) ? '[warm]' : '[thoughtful]';
      return boundary + (expressive ? direction + ' ' : '');
    }).trim() || (expressive ? '[warm] I hear you.' : 'I hear you.');
}
