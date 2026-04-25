/**
 * 미감 팔레트 카탈로그 — 20종.
 *
 * ⭐ 자현이 늘릴 곳 ⭐
 * 새 미감을 추가하면 곧바로 randomComposer가 풀에서 뽑음.
 */

export interface ColorPalette {
  name: string;
  colors: string[];
  emissiveBoost: number;
  weights?: number[];
}

export const PALETTES: ColorPalette[] = [
  // ─── Studio Ghibli ───
  {
    name: 'Ghibli — Totoro 숲',
    colors: ['#8FB339', '#5C8001', '#1B512D', '#A4C639', '#F5DDA9', '#D4A373', '#6B4423'],
    emissiveBoost: 0.6,
  },
  {
    name: 'Ghibli — Mononoke 검',
    colors: ['#1A2E2A', '#3D5C4F', '#7C9885', '#D9D2B6', '#8B0000', '#F4F1DE'],
    emissiveBoost: 0.7,
  },
  {
    name: 'Ghibli — Spirited Away 욕탕',
    colors: ['#D62828', '#F77F00', '#FCBF49', '#003049', '#EAE2B7', '#9C27B0'],
    emissiveBoost: 1.0,
  },
  {
    name: 'Ghibli — Howl 화염',
    colors: ['#FF6B35', '#F7931E', '#FFD23F', '#1B1B3A', '#693668', '#FFB627'],
    emissiveBoost: 1.4,
  },

  // ─── 한국 전통 ───
  {
    name: '한국 단청 — 오방색',
    colors: ['#E94B3C', '#1F4E79', '#F7D08A', '#1E5631', '#0B0B0B', '#FFFFFF'],
    emissiveBoost: 0.7,
    weights: [3, 3, 2, 2, 1, 1],
  },
  {
    name: '한국 한복 — 자수',
    colors: ['#C8102E', '#FFB81C', '#003F87', '#00843D', '#FFFFFF', '#722F37'],
    emissiveBoost: 0.6,
  },
  {
    name: '한국 청자 — 비색',
    colors: ['#7BA098', '#A8C8B5', '#5E8B7E', '#D9E5D6', '#3F5C4D', '#E8E4C9'],
    emissiveBoost: 0.4,
  },
  {
    name: '한국 옻칠 — 흑적금',
    colors: ['#0B0B0B', '#5C0000', '#8B0000', '#D4AF37', '#1A0F0F', '#F5DEB3'],
    emissiveBoost: 0.8,
    weights: [3, 2, 2, 3, 2, 1],
  },

  // ─── 사이버펑크 ───
  {
    name: '사이버펑크 — 신스웨이브',
    colors: ['#FF00FF', '#00FFFF', '#FF0080', '#7B00FF', '#00FF9F', '#FFFF00'],
    emissiveBoost: 1.6,
  },
  {
    name: '사이버펑크 — 블레이드러너',
    colors: ['#FF6B9D', '#C44569', '#F8B500', '#3D5AFE', '#00BCD4', '#1A1A2E'],
    emissiveBoost: 1.5,
  },

  // ─── 자연 ───
  {
    name: '자연 — 오로라 + 심해',
    colors: ['#00C9A7', '#845EC2', '#0081CF', '#4FFBDF', '#1A1A40', '#3FA796', '#A0E7E5'],
    emissiveBoost: 1.1,
  },
  {
    name: '자연 — 노을 + 사막',
    colors: ['#FF6F61', '#F7B267', '#F4845F', '#F25C54', '#7D5A50', '#FFD8B1'],
    emissiveBoost: 0.9,
  },
  {
    name: '자연 — 산호초',
    colors: ['#FF6B9D', '#FFC75F', '#F9F871', '#00C9A7', '#845EC2', '#FFFFFF'],
    emissiveBoost: 1.0,
  },

  // ─── 8-bit / 데모씬 ───
  {
    name: '8-bit — GameBoy',
    colors: ['#0F380F', '#306230', '#8BAC0F', '#9BBC0F'],
    emissiveBoost: 1.2,
  },
  {
    name: '8-bit — NES 16색',
    colors: ['#7C7C7C', '#0000FC', '#0000BC', '#4428BC', '#940084', '#A80020', '#A81000', '#881400', '#503000', '#007800', '#006800', '#005800', '#004058', '#000000'],
    emissiveBoost: 1.3,
  },
  {
    name: '데모씬 — Plasma',
    colors: ['#FF00FF', '#FF0080', '#8000FF', '#0080FF', '#00FFFF', '#80FF00', '#FFFF00', '#FF8000'],
    emissiveBoost: 1.7,
  },

  // ─── Pixar ───
  {
    name: 'Pixar — Up 풍선',
    colors: ['#FF6B6B', '#FFD93D', '#6BCB77', '#4D96FF', '#FF8FB1', '#C9F4AA', '#FCBF49'],
    emissiveBoost: 1.0,
  },
  {
    name: 'Pixar — Inside Out 감정',
    colors: ['#FFD700', '#4169E1', '#FF1493', '#9370DB', '#FF4500'],
    emissiveBoost: 1.3,
  },

  // ─── 추상 / 미술관 ───
  {
    name: 'Mondrian — 원색 격자',
    colors: ['#E63946', '#F1C40F', '#3D5A80', '#FFFFFF', '#000000'],
    emissiveBoost: 0.5,
    weights: [3, 3, 3, 4, 2],
  },
  {
    name: 'Klee — 회화',
    colors: ['#D4A574', '#A8763E', '#5C3A21', '#3E1F1F', '#7B9E89', '#D4D4AA', '#965A3E'],
    emissiveBoost: 0.6,
  },
];

export function pickColor(palette: ColorPalette, rand: () => number): string {
  if (!palette.weights) {
    return palette.colors[Math.floor(rand() * palette.colors.length)];
  }
  const total = palette.weights.reduce((a, b) => a + b, 0);
  let r = rand() * total;
  for (let i = 0; i < palette.colors.length; i++) {
    r -= palette.weights[i];
    if (r <= 0) return palette.colors[i];
  }
  return palette.colors[palette.colors.length - 1];
}
