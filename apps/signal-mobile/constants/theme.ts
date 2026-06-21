export const ACC = {
  blu:  '#1740F5',
  bluL: '#4F6FFA',
  org:  '#FF5C1A',
  orgL: '#FF7D46',
  grn:  '#00D4A0',
  red:  '#FF3B5C',
  ylw:  '#FFB800',
  pur:  '#8B5CF6',
};

export const DARK_T = {
  bg:       '#070D1A',
  surf:     '#0E1628',
  surf2:    '#162038',
  bdr:      '#1C2E4A',
  txt:      '#FFFFFF',
  dim:      '#7A8BAA',
  cardGrad: ['#0D1E45', '#0E1628'] as const,
};

export const LIGHT_T = {
  bg:       '#F2F6FF',
  surf:     '#FFFFFF',
  surf2:    '#E8EEFF',
  bdr:      '#CDD5F0',
  txt:      '#0A1628',
  dim:      '#5A6A8A',
  cardGrad: ['#E8EEFF', '#FFFFFF'] as const,
};

export type Theme = {
  bg: string;
  surf: string;
  surf2: string;
  bdr: string;
  txt: string;
  dim: string;
  cardGrad: readonly [string, string];
};
