type Unit = { id: string; label: string | null; rent: number; deposit: number | null; ac: boolean | null; food_included: boolean | null; beds_available: number | null };

/** Rooms and rent table with an add row. `add` and `remove` are server actions bound by the caller. */
export default function UnitsEditor({ units, pid, type, add, remove, editable = true }: { units: Unit[]; pid: string; type: string; add: (fd: FormData) => Promise<void>; remove: (fd: FormData) => Promise<void>; editable?: boolean }) {
  return (
    <div className="grid gap-3">
      {units.length > 0 ? (
        <div className="card overflow-x-auto">
          <table className="table">
            <thead><tr><th>Option</th><th>Rent</th><th>Deposit</th><th>Beds free</th><th><span className="sr-only">Actions</span></th></tr></thead>
            <tbody>{units.map((u) => (
              <tr key={u.id}>
                <td>{u.label ?? 'Room'}{u.ac ? ', AC' : ''}{u.food_included ? ', food included' : ''}</td>
                <td className="num">₹{u.rent.toLocaleString('en-IN')}</td>
                <td className="num">{u.deposit ? `₹${u.deposit.toLocaleString('en-IN')}` : 'Not set'}</td>
                <td className="num">{u.beds_available ?? 'Not set'}</td>
                <td className="text-right">{editable && <form action={remove}><input type="hidden" name="uid" value={u.id} /><input type="hidden" name="pid" value={pid} /><button className="btn btn-quiet text-sm">Remove</button></form>}</td>
              </tr>))}</tbody>
          </table>
        </div>
      ) : <p className="text-sm text-muted">No rooms added yet. Add at least one with its rent.</p>}
      {editable && (
        <form action={add} className="card grid grid-cols-2 gap-3 p-3 md:grid-cols-4">
          <input type="hidden" name="pid" value={pid} />
          {type === 'pg'
            ? <label className="label">Sharing<select name="sharing" className="field" defaultValue="3"><option value="1">Single room</option>{[2, 3, 4, 5, 6, 7, 8].map((n) => <option key={n} value={n}>{n} sharing</option>)}</select></label>
            : <label className="label">BHK<input name="bhk" inputMode="decimal" className="field" placeholder="2" /></label>}
          <label className="label">Rent a month<input name="rent" required inputMode="numeric" className="field" placeholder="7500" /></label>
          <label className="label">Deposit<input name="deposit" inputMode="numeric" className="field" /></label>
          {type === 'pg' && <label className="label">Beds free now<input name="free" inputMode="numeric" className="field" /></label>}
          <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" name="ac" className="h-4 w-4 accent-[var(--color-accent)]" />AC room</label>
          <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" name="food_included" className="h-4 w-4 accent-[var(--color-accent)]" />Food included</label>
          <button className="btn col-span-2 md:col-span-2">Add this room</button>
        </form>
      )}
    </div>
  );
}
