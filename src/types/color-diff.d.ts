declare module 'color-diff' {
  export interface LabColor {
    L: number;
    a: number;
    b: number;
  }

  export interface RGBColor {
    R: number;
    G: number;
    B: number;
  }

  export function rgb_to_lab(rgb: { r: number; g: number; b: number }): LabColor;
  export function diff(color1: LabColor, color2: LabColor): number;
}

