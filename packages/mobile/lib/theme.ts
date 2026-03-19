export const DARK = {
  bg:         '#0d1117',
  card:       '#161b22',
  hover:      '#1c2128',
  border:     '#30363d',
  border2:    '#21262d',
  text:       '#e6edf3',
  textSub:    '#8b949e',
  textMuted:  '#656d76',
  inputBg:    '#0d1117',
  statusBar:  'light' as const,
} as const;

export const LIGHT = {
  bg:         '#f6f8fa',
  card:       '#ffffff',
  hover:      '#f3f4f6',
  border:     '#d0d7de',
  border2:    '#eaeef2',
  text:       '#24292f',
  textSub:    '#57606a',
  textMuted:  '#8c959f',
  inputBg:    '#ffffff',
  statusBar:  'dark' as const,
} as const;

export type AppColors = typeof DARK;
