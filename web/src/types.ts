export type Gender = 'male' | 'female';

export interface GroupEntry {
  name: string;
  members: Record<number, number>;
}

export interface ClothMap {
  version: number;
  bares: Record<Gender, number[]>;
  innershirts: Record<Gender, number[]>;
  gloveGroups: Record<Gender, GroupEntry[]>;
  jacketToArms: Record<Gender, Record<number, number>>;
  topGroups: Record<Gender, GroupEntry[]>;
  innershirtToFallbackTop: Record<Gender, Record<number, number>>;
}

export type Tab = 'gloves' | 'jackets' | 'tops' | 'innershirts';
