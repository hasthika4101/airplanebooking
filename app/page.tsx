'use client';
import { useState } from 'react';

// ── Airport lookup ────────────────────────────────────────────────────────────
const AIRPORTS = [
  { code: 'NZNE', name: 'Dairy Flat (Auckland)' },
  { code: 'YSSY', name: 'Sydney' },
  { code: 'NZRO', name: 'Rotorua' },
  { code: 'NZGB', name: 'Great Barrier Island' },
  { code: 'NZCI', name: 'Chatham Islands (Tuuta)' },
  { code: 'NZTL', name: 'Lake Tekapo' },
];

const POPULAR_ROUTES = [
  { orig: 'NZNE', dest: 'YSSY', freq: 'Weekly — Fridays',   price: '$1200' },
  { orig: 'NZNE', dest: 'NZRO', freq: 'Daily — Mon to Fri', price: '$180'  },
  { orig: 'NZNE', dest: 'NZGB', freq: '3× weekly',          price: '$220'  },
  { orig: 'NZNE', dest: 'NZCI', freq: 'Tue & Fri',          price: '$650'  },
  { orig: 'NZNE', dest: 'NZTL', freq: 'Weekly — Mondays',   price: '$420'  },
  { orig: 'YSSY', dest: 'NZNE', freq: 'Weekly — Sundays',   price: '$1200' },
];

type Tab = 'search' | 'book' | 'cancel' | 'mybookings';

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-NZ', {
    weekday: 'short', day: 'numeric', month: 'short',
    year: 'numeric', hour: '2-digit', minute: '2-digit',
    timeZone: 'Pacific/Auckland',
  });
}

export default function Home() {
  const [tab, setTab] = useState<Tab>('search');

  // Search state
  const [orig,      setOrig]      = useState('');
  const [dest,      setDest]      = useState('');
  const [date1,     setDate1]     = useState('');
  const [date2,     setDate2]     = useState('');
  const [flights,   setFlights]   = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchMsg, setSearchMsg] = useState('');

  // Book state
  const [bookId,     setBookId]     = useState('');
  const [bookFlight, setBookFlight] = useState<any>(null);
  const [bTitle,     setBTitle]     = useState('Mr');
  const [bFirst,     setBFirst]     = useState('');
  const [bLast,      setBLast]      = useState('');
  const [bEmail,     setBEmail]     = useState('');
  const [bookResult, setBookResult] = useState<any>(null);
  const [bookError,  setBookError]  = useState('');
  const [booking,    setBooking]    = useState(false);

  // Cancel state
  const [cancelRef,  setCancelRef]  = useState('');
  const [cancelMsg,  setCancelMsg]  = useState('');
  const [cancelOk,   setCancelOk]   = useState(false);
  const [cancelling, setCancelling] = useState(false);

  // My bookings state
  const [myEmail,   setMyEmail]   = useState('');
  const [myFlights, setMyFlights] = useState<any[]>([]);
  const [myMsg,     setMyMsg]     = useState('');
  const [loadingMy, setLoadingMy] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  function prefill(o: string, d: string) {
    setOrig(o); setDest(d);
    setDate1(today);
    const future = new Date();
    future.setDate(future.getDate() + 60);
    setDate2(future.toISOString().split('T')[0]);
    setFlights([]); setSearchMsg('');
  }

  // Click "Book ->" on a result: store the whole flight and auto-fill bookId
  function selectFlight(f: any) {
    setBookFlight(f);
    setBookId(f._id);
    setBookResult(null);
    setBookError('');
    setTab('book');
  }

  // GET /api/schedules?orig=&dest=&date1=&date2=
  // Returns: Schedule[]  each has bookings[]
  async function handleSearch() {
    if (!orig || !dest || !date1 || !date2) {
      setSearchMsg('Please fill in all four fields.'); return;
    }
    if (orig === dest) {
      setSearchMsg('Origin and destination cannot be the same.'); return;
    }
    setSearching(true); setSearchMsg(''); setFlights([]);
    try {
      const res  = await fetch(`/api/schedules?orig=${orig}&dest=${dest}&date1=${date1}&date2=${date2}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Search failed');
      const arr = Array.isArray(data) ? data : [];
      setFlights(arr);
      if (arr.length === 0) setSearchMsg('No flights found. Try a wider date range.');
    } catch (err: any) {
      setSearchMsg('Error: ' + err.message);
    }
    setSearching(false);
  }

  // POST /api/bookings
  // Sends:   { scheduleId, title, firstName, lastName, email }
  // Returns: { bookingRef, schedule }
  async function handleBook() {
    if (!bookId || !bFirst.trim() || !bLast.trim() || !bEmail.trim()) {
      setBookError('Please fill in all fields.'); return;
    }
    setBooking(true); setBookError(''); setBookResult(null);
    try {
      const res  = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scheduleId: bookId,
          title:     bTitle,
          firstName: bFirst.trim(),
          lastName:  bLast.trim(),
          email:     bEmail.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) { setBookError(data.error || 'Booking failed.'); }
      else         { setBookResult(data); }   // { bookingRef, schedule }
    } catch (err: any) {
      setBookError(err.message);
    }
    setBooking(false);
  }

  // DELETE /api/bookings/[ref]
  // Returns: { message: 'Booking cancelled' }  or  { error: '...' }
  async function handleCancel() {
    if (!cancelRef.trim()) { setCancelMsg('Please enter your booking reference.'); return; }
    setCancelling(true); setCancelMsg('');
    try {
      const res  = await fetch(`/api/bookings/${cancelRef.trim().toUpperCase()}`, { method: 'DELETE' });
      const data = await res.json();
      setCancelOk(res.ok);
      setCancelMsg(res.ok ? (data.message || 'Booking cancelled.') : (data.error || 'Could not cancel.'));
      if (res.ok) setCancelRef('');
    } catch (err: any) {
      setCancelOk(false); setCancelMsg(err.message);
    }
    setCancelling(false);
  }

  // GET /api/passengers/[email]
  // Returns: Schedule[]  — schedules where a booking has that email (ALL bookings still present)
  async function handleMyBookings() {
    if (!myEmail.trim()) { setMyMsg('Please enter your email.'); return; }
    setLoadingMy(true); setMyMsg(''); setMyFlights([]);
    try {
      const res  = await fetch(`/api/passengers/${encodeURIComponent(myEmail.trim())}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch');
      const arr = Array.isArray(data) ? data : [];
      setMyFlights(arr);
      if (arr.length === 0) setMyMsg('No bookings found for that email address.');
    } catch (err: any) {
      setMyMsg('Error: ' + err.message);
    }
    setLoadingMy(false);
  }

  const tabClass = (t: Tab) =>
    `flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium transition-all cursor-pointer border-0 rounded-lg
    ${tab === t
      ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm ring-1 ring-black/10 dark:ring-white/10'
      : 'bg-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans">

      {/* HERO */}
      <div className="bg-gradient-to-br from-blue-900 via-blue-700 to-blue-500 text-white px-6 py-14 text-center relative overflow-hidden">
        <div className="absolute top-0 right-0 w-72 h-72 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-52 h-52 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/4" />
        <div className="relative z-10 max-w-2xl mx-auto">
          <span className="inline-flex items-center gap-2 bg-white/15 border border-white/25 rounded-full px-4 py-1.5 text-xs mb-5 tracking-wide">
            ✈ New Zealand's Premier Private Jet Service
          </span>
          <h1 className="text-4xl font-semibold mb-3 leading-tight">Fly beyond the ordinary</h1>
          <p className="text-blue-100 text-base mb-8 leading-relaxed">
            Luxury point-to-point flights from Dairy Flat Airport to New Zealand's most exclusive destinations
          </p>
          <div className="flex justify-center gap-10 flex-wrap">
            {[['6','Destinations'],['5','Aircraft'],['Daily','Rotorua flights']].map(([n,l]) => (
              <div key={l} className="text-center">
                <div className="text-2xl font-semibold">{n}</div>
                <div className="text-xs text-blue-200 mt-0.5">{l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* MAIN */}
      <div className="max-w-2xl mx-auto px-4 py-8">

        {/* Tabs */}
        <div className="flex gap-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl p-1 mb-6">
          {(['search','book','cancel','mybookings'] as Tab[]).map((t) => (
            <button key={t} className={tabClass(t)} onClick={() => setTab(t)}>
              {t === 'search' && '🔍'}
              {t === 'book'   && '🎫'}
              {t === 'cancel' && '✕'}
              {t === 'mybookings' && '👤'}
              {t === 'search' ? 'Search' : t === 'book' ? 'Book' : t === 'cancel' ? 'Cancel' : 'My bookings'}
            </button>
          ))}
        </div>

        {/* ── SEARCH TAB ── */}
        {tab === 'search' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-700 p-6 shadow-sm">
              <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg px-4 py-2.5 text-sm text-blue-700 dark:text-blue-300 mb-5">
                ℹ Select origin, destination and a date range, then click Search.
              </div>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">From</label>
                  <select value={orig} onChange={e => setOrig(e.target.value)}
                    className="rounded-lg border border-zinc-200 dark:border-zinc-700 px-3 py-2.5 text-sm bg-white dark:bg-zinc-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Select origin</option>
                    {AIRPORTS.map(a => <option key={a.code} value={a.code}>{a.code} — {a.name}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">To</label>
                  <select value={dest} onChange={e => setDest(e.target.value)}
                    className="rounded-lg border border-zinc-200 dark:border-zinc-700 px-3 py-2.5 text-sm bg-white dark:bg-zinc-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Select destination</option>
                    {AIRPORTS.map(a => <option key={a.code} value={a.code}>{a.code} — {a.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Earliest departure</label>
                  <input type="date" value={date1} min={today} onChange={e => setDate1(e.target.value)}
                    className="rounded-lg border border-zinc-200 dark:border-zinc-700 px-3 py-2.5 text-sm bg-white dark:bg-zinc-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Latest departure</label>
                  <input type="date" value={date2} min={date1 || today} onChange={e => setDate2(e.target.value)}
                    className="rounded-lg border border-zinc-200 dark:border-zinc-700 px-3 py-2.5 text-sm bg-white dark:bg-zinc-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              {searchMsg && (
                <div className="mb-4 rounded-lg px-4 py-2.5 text-sm border bg-red-50 border-red-200 text-red-600 dark:bg-red-950 dark:border-red-800 dark:text-red-300">
                  ⚠ {searchMsg}
                </div>
              )}
              <button onClick={handleSearch} disabled={searching}
                className="w-full py-3 bg-blue-700 hover:bg-blue-800 disabled:bg-blue-400 text-white rounded-xl text-sm font-semibold transition-colors">
                {searching ? 'Searching…' : '🔍 Search available flights'}
              </button>
            </div>

            {/* Popular routes */}
            <div>
              <p className="text-xs font-semibold text-zinc-400 mb-3 uppercase tracking-wide">Popular routes — click to prefill</p>
              <div className="grid grid-cols-2 gap-2">
                {POPULAR_ROUTES.map(r => (
                  <button key={r.orig+r.dest} onClick={() => prefill(r.orig, r.dest)}
                    className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-left hover:border-blue-400 transition-colors shadow-sm">
                    <div className="font-semibold text-sm text-zinc-800 dark:text-white">✈ {r.orig} → {r.dest}</div>
                    <div className="text-xs text-zinc-400 mt-0.5">{r.freq}</div>
                    <div className="text-xs font-medium text-blue-600 mt-1">from {r.price}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Results */}
            {flights.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">
                  {flights.length} flight{flights.length > 1 ? 's' : ''} found
                </p>
                {flights.map((f) => {
                  const seats = f.capacity - (f.bookings?.length ?? 0);
                  return (
                    <div key={f._id}
                      className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-2xl p-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 flex-wrap text-lg font-semibold text-zinc-800 dark:text-white mb-1">
                          <span>{f.origin}</span>
                          <span className="text-base text-blue-500">✈</span>
                          <span>{f.destination}</span>
                          <span className="text-xs font-normal bg-zinc-100 dark:bg-zinc-800 text-zinc-500 px-2 py-0.5 rounded-full font-mono">{f.flightNumber}</span>
                        </div>
                        <div className="text-xs text-zinc-500 dark:text-zinc-400">🛫 {formatDate(f.departureTime)}</div>
                        <div className="text-xs text-zinc-500 dark:text-zinc-400">🛬 {formatDate(f.arrivalTime)}</div>
                        <div className="text-xs text-zinc-400 mt-0.5">{f.aircraft}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-xl font-bold text-blue-700 dark:text-blue-400">${f.price}</div>
                        <div className={`text-xs mt-0.5 font-medium ${seats === 0 ? 'text-red-500' : seats <= 2 ? 'text-amber-500' : 'text-green-600'}`}>
                          {seats === 0 ? 'Fully booked' : `${seats} seat${seats !== 1 ? 's' : ''} left`}
                        </div>
                        {seats > 0 ? (
                          <button onClick={() => selectFlight(f)}
                            className="mt-2 px-4 py-1.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg transition-colors">
                            Book →
                          </button>
                        ) : (
                          <span className="mt-2 inline-block px-4 py-1.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-400 text-xs rounded-lg">
                            Unavailable
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── BOOK TAB ── */}
        {tab === 'book' && (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-700 p-6 shadow-sm space-y-4">

            {/* Selected flight summary */}
            {bookFlight ? (
              <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-xl px-4 py-3">
                <p className="text-xs font-semibold text-blue-500 uppercase tracking-wide mb-1">Selected flight</p>
                <p className="font-bold text-blue-800 dark:text-blue-200">
                  {bookFlight.flightNumber}: {bookFlight.origin} → {bookFlight.destination}
                </p>
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-0.5">
                  {formatDate(bookFlight.departureTime)} · {bookFlight.aircraft} · <strong>${bookFlight.price}</strong>
                </p>
                <p className="text-xs text-blue-500 mt-0.5">
                  {bookFlight.capacity - (bookFlight.bookings?.length ?? 0)} seat(s) remaining
                </p>
              </div>
            ) : (
              <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg px-4 py-2.5 text-sm text-blue-700 dark:text-blue-300">
                ℹ Search for a flight first and click "Book →", or paste a schedule ID below.
              </div>
            )}

            {/* Show invoice AFTER successful booking */}
            {bookResult ? (
              <div className="space-y-4">
                <div className="bg-green-50 dark:bg-green-950 border border-green-300 dark:border-green-700 rounded-2xl p-6 text-center">
                  <div className="text-4xl mb-2">✅</div>
                  <h3 className="text-xl font-bold text-green-800 dark:text-green-200 mb-1">Booking Confirmed!</h3>
                  <p className="text-green-700 dark:text-green-300 text-sm mb-3">Your booking reference is:</p>
                  <div className="text-4xl font-mono font-bold tracking-widest text-green-800 dark:text-green-200 bg-white dark:bg-zinc-900 rounded-xl px-6 py-3 inline-block border-2 border-green-300 dark:border-green-700">
                    {bookResult.bookingRef}
                  </div>
                  <p className="text-xs text-green-600 dark:text-green-400 mt-3">
                    Save this — you need it to cancel or look up your booking.
                  </p>
                </div>
                {/* Invoice — uses bookResult.schedule returned by the backend */}
                <div className="border border-zinc-200 dark:border-zinc-700 rounded-2xl overflow-hidden">
                  <div className="bg-zinc-700 dark:bg-zinc-800 px-5 py-3">
                    <p className="text-white font-semibold text-sm">Booking Invoice</p>
                  </div>
                  <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {[
                      ['Passenger',  `${bTitle} ${bFirst} ${bLast}`],
                      ['Email',       bEmail],
                      ['Flight',      bookResult.schedule?.flightNumber ?? '—'],
                      ['Route',      `${bookResult.schedule?.origin ?? '—'} → ${bookResult.schedule?.destination ?? '—'}`],
                      ['Aircraft',    bookResult.schedule?.aircraft    ?? '—'],
                      ['Departure',   bookResult.schedule?.departureTime ? formatDate(bookResult.schedule.departureTime) : '—'],
                      ['Arrival',     bookResult.schedule?.arrivalTime   ? formatDate(bookResult.schedule.arrivalTime)   : '—'],
                      ['Price',      `$${bookResult.schedule?.price ?? '—'} NZD`],
                      ['Reference',   bookResult.bookingRef],
                    ].map(([k, v]) => (
                      <div key={k} className="flex justify-between gap-4 px-5 py-2.5 text-sm">
                        <span className="text-zinc-500 font-medium shrink-0">{k}</span>
                        <span className={`text-zinc-800 dark:text-zinc-100 text-right ${k === 'Reference' ? 'font-mono font-bold tracking-widest' : ''}`}>{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <button onClick={() => { setBookResult(null); setBookFlight(null); setBookId(''); setTab('search'); }}
                  className="w-full py-3 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-sm font-semibold">
                  Search for another flight
                </button>
              </div>

            ) : (
              <>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Schedule / Flight ID</label>
                  <input value={bookId} onChange={e => setBookId(e.target.value)}
                    placeholder="Auto-filled when you click 'Book →' on a search result"
                    className="rounded-lg border border-zinc-200 dark:border-zinc-700 px-3 py-2.5 text-sm bg-white dark:bg-zinc-800 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Title</label>
                    <select value={bTitle} onChange={e => setBTitle(e.target.value)}
                      className="rounded-lg border border-zinc-200 dark:border-zinc-700 px-3 py-2.5 text-sm bg-white dark:bg-zinc-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                      {['Mr','Mrs','Miss','Ms','Dr','Prof'].map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">First name</label>
                    <input value={bFirst} onChange={e => setBFirst(e.target.value)} placeholder="First name"
                      className="rounded-lg border border-zinc-200 dark:border-zinc-700 px-3 py-2.5 text-sm bg-white dark:bg-zinc-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Last name</label>
                    <input value={bLast} onChange={e => setBLast(e.target.value)} placeholder="Last name"
                      className="rounded-lg border border-zinc-200 dark:border-zinc-700 px-3 py-2.5 text-sm bg-white dark:bg-zinc-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Email address</label>
                  <input type="email" value={bEmail} onChange={e => setBEmail(e.target.value)} placeholder="you@example.com"
                    className="rounded-lg border border-zinc-200 dark:border-zinc-700 px-3 py-2.5 text-sm bg-white dark:bg-zinc-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                {bookError && (
                  <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-lg px-4 py-2.5 text-sm">
                    ⚠ {bookError}
                  </div>
                )}
                <button onClick={handleBook} disabled={booking}
                  className="w-full py-3 bg-blue-700 hover:bg-blue-800 disabled:bg-blue-400 text-white rounded-xl text-sm font-semibold transition-colors">
                  {booking ? 'Processing…' : '🎫 Confirm booking'}
                </button>
              </>
            )}
          </div>
        )}

        {/* ── CANCEL TAB ── */}
        {tab === 'cancel' && (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-700 p-6 shadow-sm space-y-4">
            <h2 className="text-lg font-semibold text-zinc-800 dark:text-white">Cancel a booking</h2>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Enter your 8-character booking reference exactly as it appears on your confirmation. Cancellations are final.
            </p>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Booking reference</label>
              <input value={cancelRef} onChange={e => setCancelRef(e.target.value.toUpperCase())}
                placeholder="e.g. A3F9B2C1" maxLength={8}
                className="rounded-lg border border-zinc-200 dark:border-zinc-700 px-3 py-2.5 text-base font-mono tracking-widest uppercase bg-white dark:bg-zinc-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-400" />
            </div>
            {cancelMsg && (
              <div className={`rounded-lg px-4 py-2.5 text-sm border ${
                cancelOk
                  ? 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300'
                  : 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'
              }`}>
                {cancelOk ? '✅ ' : '⚠ '}{cancelMsg}
              </div>
            )}
            <button onClick={handleCancel} disabled={cancelling}
              className="w-full py-3 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white rounded-xl text-sm font-semibold transition-colors">
              {cancelling ? 'Cancelling…' : '✕ Cancel this booking'}
            </button>
          </div>
        )}

        {/* ── MY BOOKINGS TAB ── */}
        {tab === 'mybookings' && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-700 p-6 shadow-sm space-y-4">
              <h2 className="text-lg font-semibold text-zinc-800 dark:text-white">My bookings</h2>
              <p className="text-sm text-zinc-400">Enter the email address you used when booking.</p>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Email address</label>
                <input type="email" value={myEmail} onChange={e => setMyEmail(e.target.value)} placeholder="you@example.com"
                  className="rounded-lg border border-zinc-200 dark:border-zinc-700 px-3 py-2.5 text-sm bg-white dark:bg-zinc-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <button onClick={handleMyBookings} disabled={loadingMy}
                className="w-full py-3 bg-blue-700 hover:bg-blue-800 disabled:bg-blue-400 text-white rounded-xl text-sm font-semibold transition-colors">
                {loadingMy ? 'Loading…' : '👤 Find my bookings'}
              </button>
            </div>

            {myMsg && (
              <div className="text-center py-8 text-zinc-500 dark:text-zinc-400">
                <div className="text-3xl mb-2">📭</div>
                <p className="text-sm">{myMsg}</p>
              </div>
            )}

            {myFlights.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">
                  {myFlights.length} booking{myFlights.length > 1 ? 's' : ''} found
                </p>
                {myFlights.map((f) => {
                  // Backend returns all bookings[] — find the one matching this user's email
                  const myBooking = f.bookings?.find(
                    (b: any) => b.passengerEmail?.toLowerCase() === myEmail.trim().toLowerCase()
                  );
                  return (
                    <div key={f._id} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-2xl p-5 shadow-sm">
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 flex-wrap text-base font-semibold text-zinc-800 dark:text-white mb-2">
                            <span>{f.origin}</span>
                            <span className="text-blue-500">✈</span>
                            <span>{f.destination}</span>
                            <span className="text-xs font-normal bg-zinc-100 dark:bg-zinc-800 text-zinc-500 px-2 py-0.5 rounded-full font-mono">{f.flightNumber}</span>
                          </div>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400">🛫 {formatDate(f.departureTime)}</p>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400">🛬 {formatDate(f.arrivalTime)}</p>
                          <p className="text-xs text-zinc-400 mt-0.5">{f.aircraft} · ${f.price} NZD</p>
                          {myBooking && (
                            <p className="text-sm mt-1 text-zinc-700 dark:text-zinc-300">
                              Passenger: <span className="font-medium">{myBooking.passengerName}</span>
                            </p>
                          )}
                        </div>
                        {myBooking && (
                          <div className="text-right shrink-0">
                            <p className="text-xs text-zinc-400 mb-1">Booking ref</p>
                            <p className="text-xl font-mono font-bold tracking-widest text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 px-3 py-1.5 rounded-lg border border-blue-200 dark:border-blue-800">
                              {myBooking.bookingRef}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Features strip */}
        <div className="grid grid-cols-3 gap-3 mt-10">
          {[
            { icon: '✈', title: 'Luxury fleet',      desc: 'SyberJet, HondaJet & Cirrus aircraft' },
            { icon: '⚡', title: 'Real-time booking', desc: 'Instant confirmation & unique ref'      },
            { icon: '📍', title: '6 destinations',   desc: 'From Auckland to Sydney & beyond'       },
          ].map(item => (
            <div key={item.title} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl p-4 text-center shadow-sm">
              <div className="text-2xl mb-2">{item.icon}</div>
              <div className="text-sm font-semibold text-zinc-800 dark:text-white mb-1">{item.title}</div>
              <div className="text-xs text-zinc-400 leading-relaxed">{item.desc}</div>
            </div>
          ))}
        </div>

        <footer className="mt-10 text-center text-xs text-zinc-400 dark:text-zinc-600 pb-6">
          © 2026 Dairy Flat Airlines · ICAO: NZNE · YSSY · NZRO · NZGB · NZCI · NZTL
        </footer>
      </div>
    </div>
  );
}