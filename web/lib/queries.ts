import { supabase } from './supabase/server';

export type Filters = { city?: string; type?: string; gender?: string; q?: string; min?: string; max?: string; sort?: string; page?: string };
export type Card = { id: string; type: 'pg' | 'home'; name: string; gender: string; address: string | null; area_label: string | null; category: string | null; google_rating: number | null; google_reviews: number | null; verified: string; score: number; lat: number | null; lng: number | null; cities: { name: string; slug: string } | null; units: { rent: number; bhk: number | null }[] };

const COLS = 'id,type,name,gender,address,area_label,category,google_rating,google_reviews,verified,score,lat,lng,cities!inner(name,slug),units(rent,bhk)';
const COLS_PRICE = COLS.replace('units(', 'units!inner(');
export const PUBLIC_COLS = 'id,type,owner_id,source,name,gender,description,address,area_label,lat,lng,owner_kind,gate_time,hours,food_option,amenities,rules,category,google_rating,google_reviews,status,verified,score,rejection_reason,listing_url,published_at,updated_at';
export const minRent = (c: Card) => (c.units.length ? Math.min(...c.units.map((u) => u.rent)) : null);

export async function search(f: Filters, limit = 24) {
  const sb = await supabase();
  const page = Math.max(1, Number(f.page) || 1);
  let q = sb.from('properties').select(f.min || f.max ? COLS_PRICE : COLS, { count: 'exact' }).eq('status', 'published');
  if (f.city) q = q.eq('cities.slug', f.city);
  if (f.type === 'pg' || f.type === 'home') q = q.eq('type', f.type);
  if (f.gender === 'boys' || f.gender === 'girls') q = q.in('gender', [f.gender, 'both']);
  if (f.q) { const t = f.q.replace(/[%,()]/g, ' ').trim(); if (t) q = q.or(`name.ilike.%${t}%,address.ilike.%${t}%,area_label.ilike.%${t}%`); }
  if (f.min) q = q.gte('units.rent', Number(f.min) || 0);
  if (f.max) q = q.lte('units.rent', Number(f.max) || 0);
  q = f.sort === 'reviews' ? q.order('google_reviews', { ascending: false, nullsFirst: false }) : q.order('score', { ascending: false });
  const from = (page - 1) * limit;
  const { data, count } = await q.range(from, from + limit - 1);
  const rows = (data ?? []) as unknown as Card[];
  if (f.sort === 'price') rows.sort((a, b) => (minRent(a) ?? 1e9) - (minRent(b) ?? 1e9));
  return { rows, total: count ?? 0, page, pages: Math.ceil((count ?? 0) / limit) };
}

export type Prop = { id: string; type: 'pg' | 'home'; owner_id: string | null; source: string; name: string; gender: string; description: string | null; address: string | null; area_label: string | null; lat: number | null; lng: number | null; owner_kind: string | null; gate_time: string | null; hours: string | null; food_option: string | null; amenities: string[] | null; rules: string | null; category: string | null; google_rating: number | null; google_reviews: number | null; status: string; verified: string; score: number; cities: { name: string } | null };
export async function property(id: string): Promise<Prop | null> {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const sb = await supabase();
  const { data: p } = await sb.from('properties').select(PUBLIC_COLS + ',cities(name)').eq('id', id).maybeSingle();
  return (p as unknown as Prop) ?? null;
}
export async function propertyExtras(id: string, lat: number | null, lng: number | null, type: string) {
  const sb = await supabase();
  const [u, rv, photos, near] = await Promise.all([
    sb.from('units').select('*').eq('property_id', id).order('rent'),
    sb.from('reviews').select('id,rating_overall,rating_food,rating_clean,rating_safety,rating_owner,body,created_at,profiles(full_name)').eq('property_id', id).eq('status', 'approved').order('created_at', { ascending: false }).limit(20),
    sb.from('photos').select('id,path,caption').eq('property_id', id).eq('approved', true).order('sort'),
    lat != null && lng != null
      ? sb.from('properties').select('id,name,gender,google_rating,google_reviews').eq('status', 'published').eq('type', type).neq('id', id).gte('lat', lat - 0.01).lte('lat', lat + 0.01).gte('lng', lng - 0.01).lte('lng', lng + 0.01).order('score', { ascending: false }).limit(4)
      : Promise.resolve({ data: [] as { id: string; name: string; gender: string; google_rating: number | null; google_reviews: number | null }[] }),
  ]);
  return { units: u.data ?? [], reviews: (rv.data ?? []) as unknown as { id: string; rating_overall: number; body: string | null; created_at: string; profiles: { full_name: string } | null }[], photos: photos.data ?? [], near: near.data ?? [] };
}

export async function stats() {
  const sb = await supabase();
  const [a, b] = await Promise.all([
    sb.from('properties').select('id', { count: 'exact', head: true }).eq('status', 'published').eq('type', 'pg'),
    sb.from('properties').select('id', { count: 'exact', head: true }).eq('status', 'published').eq('type', 'home'),
  ]);
  return { pg: a.count ?? 0, home: b.count ?? 0 };
}
