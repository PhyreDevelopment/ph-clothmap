export type Gender = 'male' | 'female';

export interface ClothMap {
  version: number;
  bares: Record<Gender, number[]>;
  gloves: Record<Gender, Record<number, number>>;
}

export type Tab = 'gloves' | 'bares';
