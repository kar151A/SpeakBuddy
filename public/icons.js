const paths = {
  home:'<path d="m3 10 9-7 9 7v9a2 2 0 0 1-2 2h-4v-7H9v7H5a2 2 0 0 1-2-2z"/>',
  tutors:'<circle cx="10" cy="8" r="3.2"/><path d="M3 20v-2a7 7 0 0 1 14 0v2M16 5.2a3.1 3.1 0 0 1 0 6M19 14a5 5 0 0 1 2 4v2"/>',
  chart:'<path d="M4 20h16M6 16v-4m6 4V7m6 9V4"/>',
  gear:'<path d="m9.5 3-.6 2.2-2 .9-2.1-.8-1.6 2.8 1.5 1.6-.2 2.3-1.3 1.7 1.6 2.8 2.2-.5 1.9 1.1.6 2.1h3.2l.7-2.1 2-1 2.1.5 1.6-2.8-1.5-1.6v-2.3l1.5-1.7-1.7-2.8-2.1.7-2-1-.6-2.1z"/><circle cx="11.2" cy="11.4" r="2.9"/>',
  mic:'<rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5.5 11.8a6.5 6.5 0 0 0 13 0M12 19v3m-3 0h6"/>',
  wave:'<path d="M3 10v4m4-7v10m5-14v18m5-14v10m4-7v4"/>',
  spark:'<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5z"/>',
  clock:'<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3 2"/>',
  back:'<path d="m14.5 5-7 7 7 7"/>', next:'<path d="m9 5 7 7-7 7"/>',
  play:'<path d="m8 5 11 7-11 7z" fill="currentColor" stroke="none"/>',
  book:'<path d="M3 4h4c3 0 4 1 5 2 1-1 2-2 5-2h4v14h-4c-2 0-4 1-5 2-1-1-3-2-5-2H3zM12 7v13"/>',
  check:'<path d="m4.5 12 4.5 4.5 10-10"/>', close:'<path d="m6 6 12 12M18 6 6 18"/>',
  volume:'<path d="M3 9h4l5-4v14l-5-4H3zM16 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
  mute:'<path d="M3 9h4l5-4v14l-5-4H3zM16 9l5 6m0-6-5 6"/>',
  end:'<path d="M3 15c1-7 17-7 18 0l-1 3-5-1v-3a12 12 0 0 0-6 0v3l-5 1z"/>',
  bulb:'<path d="M9 17h6m-5 4h4m-5-7a6 6 0 1 1 6 0v1H9z"/>',
  keyboard:'<rect x="2.5" y="5" width="19" height="14" rx="3"/><path d="M6 9h.1M10 9h.1M14 9h.1M18 9h.1M6 12h.1M10 12h.1M14 12h.1M18 12h.1M8 15h8"/>',
  flag:'<path d="M5 21V4c5-4 9 4 15 0v10c-6 4-10-4-15 0"/>',
  calendar:'<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4m10-4v4M3 10h18"/>',
  search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
  send:'<path d="m3 10 18-7-7 18-3-8zM11 13l6-6"/>',
  reset:'<path d="M4 10a8.5 8.5 0 1 1 1 8M4 4v6h6"/>',
  leaf:'<path d="M20 4C11 3 4 6 4 13a6 6 0 0 0 6 6c7 0 10-7 10-15zM5 19l9-9"/>',
  repeat:'<path d="m16 2 4 4-4 4M4 11V9a3 3 0 0 1 3-3h13M8 22l-4-4 4-4m12-1v2a3 3 0 0 1-3 3H4"/>'
};
export function icon(name,size=20) {
  return '<svg aria-hidden="true" focusable="false" width="'+size+'" height="'+size+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'+(paths[name]||'')+'</svg>';
}
