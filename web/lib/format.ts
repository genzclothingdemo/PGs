// Shared by server and client components (no server-only imports here).
export type Card = { id: string; type: 'pg' | 'home'; name: string; gender: string; area_label: string | null; address: string | null; city: string; food_option: string | null;
  google_rating: number | null; google_reviews: number | null; verified: string; min_rent: number | null; sharing: number[] | null; bhk: number | null; photo: string | null };

export const GENDER: Record<string, string> = { girls: 'Girls', boys: 'Boys', both: 'Boys and girls', not_stated: 'Not stated' };
export const FOOD: Record<string, string> = { included: 'Food included', tiffin: 'Tiffin available', optional: 'Food optional', self_cook: 'Self cooking', none: 'No food' };
export const photoUrl = (path: string) => `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/property-photos/${path}`;

