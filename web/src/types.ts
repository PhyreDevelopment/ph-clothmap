export type Gender = 'male' | 'female';

export interface ClothMap {
  version: number;
  empty: { shirt: number; top: number };
  bares: Record<Gender, number[]>;
  innershirts: Record<Gender, number[]>;
  gloves: Record<Gender, Record<number, number>>;
  jacketToArms: Record<Gender, Record<number, number>>;
  tops: Record<Gender, Record<number, number>>;
  innershirtToFallbackTop: Record<Gender, Record<number, number>>;
}

export type Tab = 'gloves' | 'jackets' | 'tops' | 'bares' | 'innershirts';
