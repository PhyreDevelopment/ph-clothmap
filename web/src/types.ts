export type Gender = 'male' | 'female';

export interface ClothMap {
  version: number;
  bares: Record<Gender, number[]>;
  innershirts: Record<Gender, number[]>;
  gloves: Record<Gender, Record<number, number>>;
  shirts: Record<Gender, Record<number, number>>;
  jacketToArms: Record<Gender, Record<number, number>>;
  tops: Record<Gender, Record<number, number>>;
  innershirtToFallbackTop: Record<Gender, Record<number, number>>;
}

export type Tab = 'gloves' | 'shirts' | 'jackets' | 'tops' | 'innershirts';
