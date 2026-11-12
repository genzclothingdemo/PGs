import 'server-only';
import { q, one } from './db';

export type Filters = { city?: string; type?: string; gender?: string; food?: string; q?: string; max?: string; sort?: string; page?: string };
import type { Card } from './format';
export type { Card } from './format';
export { GENDER, FOOD, photoUrl } from './format';

const CARD_SQL = `select p.id, p.type, p.name, p.gender, p.area_label, p.address, c.name city, p.food_option, p.google_rating::float, p.google_reviews, p.verified,
  u.min_rent, u.sharing, u.bhk::float, ph.path photo
  from properties p join cities c on c.id = p.city_id
  left join lateral (select min(rent) min_rent, array_agg(distinct sharing order by sharing) filter (where sharing is not null) sharing, max(bhk) bhk from units where property_id = p.id) u on true
  left join lateral (select path from photos where property_id = p.id and approved order by sort limit 1) ph on true`;

export async function search(f: Filters, limit = 24) {
  const w = [`p.status = 'published'`]; const v: unknown[] = [];
  const add = (sql: string, val: unknown) => { v.push(val); w.push(sql.replaceAll('$?', `$${v.length}`)); };
  if (f.city) add('c.slug = $?', f.city);
  if (f.type === 'pg' || f.type === 'home') add('p.type = $?::property_type', f.type);
  if (f.gender === 'girls' || f.gender === 'boys') add(`p.gender in ($?::gender_for, 'both')`, f.gender);
  if (f.food === 'with') w.push(`p.food_option in ('included','tiffin','optional')`);
  if (f.food === 'without') w.push(`(p.food_option in ('none','self_cook','optional') or p.type = 'home')`);
  if (f.q?.trim()) add(`(p.name ilike '%' || $? || '%' or p.area_label ilike '%' || $? || '%' or p.address ilike '%' || $? || '%')`, f.q.trim());
  const max = Number(f.max);
  if (max > 0) add('u.min_rent <= $?', max);
  const order = f.sort === 'price' ? 'u.min_rent asc nulls last, p.score desc' : f.sort === 'new' ? 'p.published_at desc nulls last' : `(u.min_rent is not null) desc, p.score desc`;
  const page = Math.max(1, Number(f.page) || 1);
  const where = w.join(' and ');
  const rows = await q<Card>(`${CARD_SQL} where ${where} order by ${order} limit ${limit} offset ${(page - 1) * limit}`, v);
  const total = Number((await one<{ n: string }>(`select count(*) n from properties p join cities c on c.id = p.city_id left join lateral (select min(rent) min_rent from units where property_id = p.id) u on true where ${where}`, v))?.n ?? 0);
  return { rows, total, page, pages: Math.max(1, Math.ceil(total / limit)) };
}

export async function cardsByIds(ids: string[]) {
  const clean = ids.filter((x) => /^[0-9a-f-]{36}$/.test(x)).slice(0, 60);
  if (!clean.length) return [];
  return q<Card>(`${CARD_SQL} where p.status = 'published' and p.id = any($1::uuid[])`, [clean]);
}

export async function stats() {
  const r = await one<{ pg: string; home: string; priced: string }>(`select count(*) filter (where type='pg') pg, count(*) filter (where type='home') home,
    count(*) filter (where exists (select 1 from units u where u.property_id = p.id) and type='pg') priced from properties p where status='published'`);
  return { pg: Number(r?.pg ?? 0), home: Number(r?.home ?? 0), priced: Number(r?.priced ?? 0) };
}

export async function topAreas(limit = 10) {
  return q<{ area: string; n: number }>(`select area_label area, count(*)::int n from properties where status='published' and area_label is not null and area_label <> '' group by 1 order by 2 desc limit $1`, [limit]);
}

export type Detail = Card & { description: string | null; gate_time: string | null; hours: string | null; amenities: string[] | null; rules: string | null; category: string | null;
  lat: number | null; lng: number | null; source: string; owner_id: string | null; listing_url: string | null; has_phone: boolean; owner_kind: string | null };
export async function property(id: string) {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const p = await one<Detail>(`${CARD_SQL.replace('select p.id,', `select p.description, p.gate_time, p.hours, p.amenities, p.rules, p.category, p.lat, p.lng, p.source, p.owner_id, p.listing_url, p.owner_kind, (p.phone is not null) has_phone, p.id,`)} where p.id = $1 and p.status = 'published'`, [id]);
  if (!p) return null;
  const [units, photos, near] = await Promise.all([
    q<{ id: string; label: string | null; sharing: number | null; bhk: number | null; area_sqft: number | null; furnishing: string | null; rent: number; deposit: number | null; ac: boolean | null; food_included: boolean | null; beds_available: number | null }>(
      `select id, label, sharing, bhk::float, area_sqft, furnishing, rent, deposit, ac, food_included, beds_available from units where property_id = $1 order by rent`, [id]),
    q<{ id: string; path: string; caption: string | null }>(`select id, path, caption from photos where property_id = $1 and approved order by sort`, [id]),
    p.lat != null ? q<Card>(`${CARD_SQL} where p.status = 'published' and p.type = $2 and p.id <> $1 and p.lat between $3 - 0.012 and $3 + 0.012 and p.lng between $4 - 0.012 and $4 + 0.012 order by (u.min_rent is not null) desc, p.score desc limit 4`, [id, p.type, p.lat, p.lng]) : Promise.resolve([] as Card[]),
  ]);
  return { p, units, photos, near };
}
