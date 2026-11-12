// Apply plan.json (from enrich_plan.py) to the live DB in one transaction.
// Usage (from web/, so `pg` resolves): SBPW=... node ../scripts/apply_plan.mjs <plan.json> [--dry]
import fs from 'fs';
import pg from 'pg';
const [file, flag] = process.argv.slice(2);
const plan = JSON.parse(fs.readFileSync(file, 'utf8'));
const c = new pg.Client({ host: 'db.gklhyavhealbwqmcrnol.supabase.co', port: 5432, user: 'postgres', password: process.env.SBPW, database: 'postgres', ssl: { rejectUnauthorized: false } });
await c.connect();
const n = { newPg: 0, upd: 0, units: 0, desc: 0, newHome: 0 };
try {
  await c.query('begin');
  const city = (await c.query("select id from cities where slug='gandhinagar'")).rows[0].id;
  for (const p of plan.new_pgs) {
    const r = await c.query(`insert into properties (type,source,external_ref,name,gender,category,address,area_label,lat,lng,phone,google_rating,google_reviews,hours,city_id,status,verified,published_at)
      values ('pg','imported',$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'published','unverified',now()) on conflict (external_ref) where external_ref is not null do nothing`,
      [p.external_ref, p.name, p.gender, p.category, p.address, p.area_label, p.lat, p.lng, p.phone, p.google_rating, p.google_reviews, p.hours, city]);
    n.newPg += r.rowCount;
  }
  const ALLOWED = new Set(['gender', 'food_option', 'gate_time', 'owner_kind', 'description']);
  for (const [id, set] of Object.entries(plan.updates)) {
    const cols = Object.keys(set).filter((k) => ALLOWED.has(k) && k !== 'description');
    if (cols.length) {
      await c.query(`update properties set ${cols.map((k, i) => `${k}=$${i + 2}${k === 'gender' ? '::gender_for' : ''}`).join(',')} where id=$1`, [id, ...cols.map((k) => set[k])]);
      n.upd++;
    }
    if (set.description) {
      // homes: prepend the structured note, strip any personal names from the old scraped notes
      const r = await c.query(`update properties set description = trim(concat_ws(' ', $2::text, nullif(trim(regexp_replace(coalesce(description,''), '(owner|contact|agent|broker)\\s*(name)?\\s*:\\s*[^.;]*[.;]?', '', 'gi')), '')))
        where id=$1 and coalesce(description,'') not like $2::text || '%'`, [id, set.description]);
      n.desc += r.rowCount;
    }
  }
  for (const [id, rows] of Object.entries(plan.units)) {
    const has = (await c.query('select count(*)::int k from units where property_id=$1', [id])).rows[0].k;
    if (has) continue;
    for (const u of rows) {
      await c.query('insert into units (property_id,label,sharing,rent,ac,food_included) values ($1,$2,$3,$4,$5,$6)', [id, u.label, u.sharing, u.rent, u.ac, u.food_included]);
      n.units++;
    }
    if (plan.notes[id]) await c.query(`update properties set description = $2 where id=$1 and description is null`, [id, plan.notes[id] + '.']);
  }
  for (const h of plan.new_homes) {
    const r = await c.query(`insert into properties (type,source,external_ref,name,gender,area_label,address,category,description,owner_kind,listing_url,city_id,status,verified,published_at)
      values ('home','imported',$1,$2,'not_stated',$3,$4,$5,$6,$7,$8,$9,'published','unverified',now()) on conflict (external_ref) where external_ref is not null do nothing returning id`,
      [h.external_ref, h.name, h.area_label, h.address, h.category, h.description || null, h.owner_kind, h.listing_url, city]);
    if (r.rowCount) {
      const bhk = parseFloat(h.bhk) || null;
      await c.query('insert into units (property_id,label,bhk,area_sqft,furnishing,rent) values ($1,$2,$3,$4,$5,$6)', [r.rows[0].id, h.bhk, bhk, h.sqft ? Number(h.sqft) : null, h.furnishing, h.rent]);
      n.newHome++;
    }
  }
  await c.query('select recompute_scores()');
  if (flag === '--dry') { await c.query('rollback'); console.log('DRY RUN (rolled back)', n); }
  else { await c.query('commit'); console.log('APPLIED', n); }
  console.log((await c.query("select type, count(*)::int total, count(*) filter (where exists(select 1 from units u where u.property_id=p.id))::int with_price, count(*) filter (where gender='not_stated' and type='pg')::int gender_unknown from properties p group by 1")).rows);
} catch (e) { await c.query('rollback'); console.error('ROLLED BACK:', e.message); process.exitCode = 1; }
await c.end();
