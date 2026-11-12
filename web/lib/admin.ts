import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ADMIN_COOKIE, verifyAdmin } from './admin-session';

/** Call at the top of every admin page and server action. */
export async function requireAdmin() {
  const jar = await cookies();
  if (!(await verifyAdmin(jar.get(ADMIN_COOKIE)?.value))) redirect('/admin/login');
}
