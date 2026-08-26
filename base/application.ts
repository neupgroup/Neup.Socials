import rawApplication from './application.json';

export type BorderRadius = 'none' | 'small' | 'medium' | 'large' | (string & {});

export interface ApplicationConfiguration {
  appName: string;
  appId: string;
  appBasePath: string;
  appDescription: string;
  appLogo: {
    mainlogo: string;
    favicon: string;
    'apple-touch-icon': string;
    'android-chrome-192x192': string;
    'android-chrome-512x512': string;
    'mstile-150x150': string;
    'safari-pinned-tab': string;
  };
  appVersion: string;
  socialChannels: Record<string, string>;
  appTheme: {
    primaryColor: string;
    secondaryColor: string;
    backgroundColor: string;
    textColor: string;
  };
  appFont?: {
    primaryFont: string;
    secondaryFont: string;
  };
  appInterface: {
    borderRadius: BorderRadius;
    boxShadow: string;
    fontSize: string;
    lineHeight: string;
  };
  updateInfo: {
    lastUpdate: string;
    updateNotes: string;
  };
}

export const application = rawApplication as ApplicationConfiguration;

const borderRadiusValues: Record<string, string> = {
  none: '0',
  small: '0.375rem',
  medium: '0.8rem',
  large: '1.25rem',
};

export function getApplicationRadius(value: BorderRadius): string {
  return borderRadiusValues[value] ?? value;
}

export function getHslChannels(color: string): string {
  const hex = color.replace('#', '');
  const normalized = hex.length === 3 ? hex.split('').map((part) => part + part).join('') : hex;
  if (!/^[0-9a-f]{6}$/i.test(normalized)) return color;

  const [red, green, blue] = [0, 2, 4].map((index) => parseInt(normalized.slice(index, index + 2), 16) / 255);
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const lightness = (max + min) / 2;
  if (max === min) return `0 0% ${Math.round(lightness * 100)}%`;

  const delta = max - min;
  const saturation = delta / (1 - Math.abs(2 * lightness - 1));
  let hue = 0;
  if (max === red) hue = ((green - blue) / delta) % 6;
  else if (max === green) hue = (blue - red) / delta + 2;
  else hue = (red - green) / delta + 4;
  hue = Math.round(hue * 60);
  if (hue < 0) hue += 360;

  return `${hue} ${Math.round(saturation * 100)}% ${Math.round(lightness * 100)}%`;
}

function getFontName(font: string): string {
  return font.split(',')[0].trim().replace(/^['"]|['"]$/g, '');
}

export function getGoogleFontUrl(fonts?: ApplicationConfiguration['appFont']): string | null {
  if (!fonts) return null;

  const fontNames = [getFontName(fonts.primaryFont), getFontName(fonts.secondaryFont)]
    .filter((font, index, allFonts) => font && allFonts.indexOf(font) === index)
    .map((font) => `family=${encodeURIComponent(font)}:wght@400;500;600;700;800`)
    .join('&');

  return fontNames ? `https://fonts.googleapis.com/css2?${fontNames}&display=swap` : null;
}
