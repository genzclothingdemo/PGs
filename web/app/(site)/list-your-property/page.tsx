import Link from 'next/link';

export const metadata = { title: 'List your PG or flat for free' };

const STEPS = [
  ['Create an account', 'Your name, mobile number, email and a password. We send a code to confirm the email.'],
  ['Add the property', 'Address, map location, food, entry time, rooms with rent, and a few photos.'],
  ['We check it', 'The PGhub team reviews every listing, usually within a day, then it goes live.'],
  ['Tenants call you', 'People see your rent and photos and call or WhatsApp you directly. You see every enquiry.'],
];

export default function ListYourProperty() {
  return (
    <div className="wrap py-6 md:py-12">
      <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:items-start">
        <div>
          <h1 className="text-3xl md:text-5xl">List your PG, hostel or flat. Free.</h1>
          <p className="mt-3 max-w-lg text-ink-2">Students and working people in Gandhinagar and Ahmedabad search here by rent, sharing and food. Put your rooms in front of them.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/owner/signup" className="btn btn-primary">Create owner account</Link>
            <Link href="/owner/login" className="btn">I already have an account</Link>
          </div>
        </div>
        <ol className="grid gap-3">
          {STEPS.map(([t, d], i) => (
            <li key={t} className="card flex gap-4 p-4">
              <span className="num grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent-soft font-medium">{i + 1}</span>
              <div><h2 className="text-lg">{t}</h2><p className="text-sm text-ink-2">{d}</p></div>
            </li>
          ))}
        </ol>
      </div>
      <p className="mt-10 max-w-2xl text-sm text-muted">Already on PGhub from a public listing? Create an account, then open your listing and choose claim. We confirm it is yours and move it to your account.</p>
    </div>
  );
}
