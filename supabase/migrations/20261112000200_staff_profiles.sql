drop policy if exists pr_staff on profiles;
create policy pr_staff on profiles for select using (is_staff());
-- Bootstrap the first super admin (run once, after that person has signed in once):
--   insert into user_roles(user_id, role) select id, 'super_admin' from profiles where email = 'YOUR@EMAIL' on conflict do nothing;
