export type Gender = 'male' | 'female';

// Mirrors illenium-appearance's uz_AutoShot URL convention. Component is the
// numeric ped component id (3 gloves, 8 innershirt, 11 top).
export function buildThumbUrl(gender: Gender, component: number, drawable: number): string {
  return `https://cfx-nui-uz_AutoShot/shots/${gender}/${component}/${drawable}.png`;
}
