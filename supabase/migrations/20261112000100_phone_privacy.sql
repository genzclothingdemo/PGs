-- Column revoke has no effect while a table-level grant exists: drop the table grant, re-grant every column except phone/whatsapp.
revoke select on properties from anon, authenticated;
grant select (id,type,owner_id,source,external_ref,name,gender,description,address,city_id,area_label,lat,lng,owner_kind,gate_time,hours,food_option,amenities,rules,category,google_rating,google_reviews,status,verified,score,rejection_reason,listing_url,published_at,created_at,updated_at) on properties to anon, authenticated;
