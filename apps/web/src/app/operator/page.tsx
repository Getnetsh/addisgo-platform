"use client";

import { FormEvent, useEffect, useState } from "react";
import styles from "./operator.module.css";

type Trip = {
  id: string;
  departure_at: string;
  fare_etb: number;
  coach_name: string;
  capacity: number;
  route?: {
    public_code?: string;
    operator_name?: string;
    origin?: { name?: string };
    destination?: { name?: string };
  };
  bookings?: { status?: string }[];
};
type Form = {
  route_code: string;
  service_type: "city" | "intercity";
  origin: string;
  origin_city: string;
  destination: string;
  destination_city: string;
  operator_name: string;
  coach_name: string;
  departure_at: string;
  arrival_at: string;
  fare_etb: string;
  capacity: string;
};

const apiUrl =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";
const initialForm: Form = {
  route_code: "",
  service_type: "city",
  origin: "",
  origin_city: "Addis Ababa",
  destination: "",
  destination_city: "Addis Ababa",
  operator_name: "",
  coach_name: "",
  departure_at: "",
  arrival_at: "",
  fare_etb: "",
  capacity: "30",
};

export default function OperatorDashboard() {
  const [key, setKey] = useState("");
  const [trips, setTrips] = useState<Trip[]>([]);
  const [form, setForm] = useState<Form>(initialForm);
  const [adding, setAdding] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const bookedSeats = trips.reduce(
    (total, trip) =>
      total +
      (trip.bookings?.filter((booking) => booking.status !== "cancelled")
        .length ?? 0),
    0,
  );
  const totalSeats = trips.reduce((total, trip) => total + trip.capacity, 0);
  const totalRevenue = trips.reduce(
    (total, trip) =>
      total +
      (trip.bookings?.filter((booking) => booking.status !== "cancelled")
        .length ?? 0) *
        trip.fare_etb,
    0,
  );
  const occupancy = totalSeats
    ? Math.round((bookedSeats / totalSeats) * 100)
    : 0;
  const operatorAlerts = [
    bookedSeats
      ? `${bookedSeats} confirmed rider${bookedSeats === 1 ? "" : "s"} across your live trips.`
      : "No confirmed bookings yet today.",
    trips.length
      ? `${trips.length} live departure${trips.length === 1 ? "" : "s"} are being monitored.`
      : "Open your schedule to start monitoring departures.",
    occupancy >= 80
      ? "Capacity is above 80% — consider adding another departure."
      : "Capacity levels are healthy.",
  ];

  async function loadTrips() {
    if (!key) return;
    setLoading(true);
    setNotice("");
    try {
      const response = await fetch(`${apiUrl}/operator/trips`, {
        headers: { "X-Operator-Key": key },
      });
      const body = await response.json();
      if (!response.ok)
        throw new Error(body.detail ?? "Could not load live trips.");
      setTrips(body as Trip[]);
      setLastUpdated(new Date());
    } catch (error) {
      setTrips([]);
      setNotice(
        error instanceof Error ? error.message : "Could not load live trips.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (key) void loadTrips();
  }, [key]);
  function update<K extends keyof Form>(field: K, value: Form[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function goTo(sectionId: string) {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth" });
  }

  async function addTrip(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setNotice("");
    try {
      const response = await fetch(`${apiUrl}/operator/trips`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Operator-Key": key },
        body: JSON.stringify({
          ...form,
          fare_etb: Number(form.fare_etb),
          capacity: Number(form.capacity),
        }),
      });
      const body = await response.json();
      if (!response.ok)
        throw new Error(body.detail ?? "Could not create the trip.");
      setForm(initialForm);
      setAdding(false);
      setNotice("Live trip created. It is now available in AddisGo.");
      await loadTrips();
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Could not create the trip.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main
      className={`${styles.shell} min-h-screen bg-[#edf3ee] text-[#102a24]`}
    >
      <header
        className={`${styles.topbar} border-b border-white/10 bg-[#043d31] text-white`}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <a className="text-xl font-black" href="/">
            Addis<span className="text-[#f1bd3d]">Go</span>
          </a>
          <div className="relative flex items-center gap-3">
            <button
              aria-expanded={notificationsOpen}
              aria-label="Operator notifications"
              className="relative grid h-9 w-9 place-items-center rounded-full bg-white/10 text-lg transition hover:bg-white/20"
              onClick={() => setNotificationsOpen((open) => !open)}
              type="button"
            >
              🔔
              <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full border-2 border-[#043d31] bg-red-500" />
            </button>
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold">
              Operator portal
            </span>
            {notificationsOpen && (
              <section className="absolute right-0 top-12 z-50 w-80 rounded-2xl border border-[#dbe7df] bg-white p-4 text-[#102a24] shadow-2xl">
                <div className="flex items-center justify-between">
                  <h2 className="font-black">Operator alerts</h2>
                  <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-black text-[#12634f]">
                    LIVE
                  </span>
                </div>
                <div className="mt-3 grid gap-2">
                  {operatorAlerts.map((alert, index) => (
                    <p
                      className="rounded-xl bg-[#f3f8f4] px-3 py-2 text-xs font-semibold leading-5"
                      key={alert}
                    >
                      <span className="mr-2 text-[#12634f]">
                        {index === 2 ? "⚡" : "●"}
                      </span>
                      {alert}
                    </p>
                  ))}
                </div>
                <button
                  className="mt-3 w-full rounded-xl border border-[#cde7d6] py-2 text-xs font-black text-[#12634f]"
                  onClick={() => {
                    setNotificationsOpen(false);
                    goTo("departures");
                  }}
                  type="button"
                >
                  View live departures
                </button>
              </section>
            )}
          </div>
        </div>
      </header>
      <div className="mx-auto grid max-w-7xl gap-6 px-5 py-6 lg:grid-cols-[210px_minmax(0,1fr)]">
        <aside className="hidden self-start rounded-2xl border border-[#dbe7df] bg-white p-3 shadow-sm lg:sticky lg:top-5 lg:block">
          <p className="px-3 pb-2 pt-1 text-[10px] font-black tracking-[.16em] text-slate-400">
            OPERATOR MENU
          </p>
          <nav className="grid gap-1 text-sm font-bold">
            <button
              className="rounded-xl bg-[#e7f4eb] px-3 py-3 text-left text-[#12634f]"
              onClick={() => goTo("overview")}
              type="button"
            >
              ◉ Overview
            </button>
            <button
              className="rounded-xl px-3 py-3 text-left text-slate-600 transition hover:bg-[#f4f7f3]"
              onClick={() => goTo("departures")}
              type="button"
            >
              ▤ Live departures
            </button>
            <button
              className="rounded-xl px-3 py-3 text-left text-slate-600 transition hover:bg-[#f4f7f3]"
              onClick={() => {
                setAdding(true);
                goTo("trip-form");
              }}
              type="button"
            >
              ＋ Create trip
            </button>
            <a
              className="mt-2 rounded-xl border border-[#dbe7df] px-3 py-3 text-slate-600 transition hover:bg-[#f4f7f3]"
              href="/"
            >
              ↗ Rider website
            </a>
          </nav>
          <div className="mt-5 rounded-xl bg-[#043d31] p-3 text-white">
            <p className="text-xs font-black text-[#f1bd3d]">LIVE MODE</p>
            <p className="mt-1 text-xs leading-5 text-emerald-100">
              Monitor routes, seats, and bookings from one place.
            </p>
          </div>
        </aside>
        <section id="overview">
          <div
            className="relative overflow-hidden rounded-3xl bg-[#064436] bg-cover bg-center p-5 text-white shadow-[0_14px_35px_rgba(4,61,49,.2)] sm:px-7 sm:py-6"
            style={{
              backgroundImage:
                "linear-gradient(90deg, rgba(4,61,49,.92) 0%, rgba(4,61,49,.72) 42%, rgba(4,61,49,.08) 72%), url('/images/operator-hero.png')",
            }}
          >
            <p className="text-xs font-black tracking-[.18em] text-[#f1bd3d]">
              LIVE OPERATIONS
            </p>
            <div className="relative mt-3 flex flex-wrap items-end justify-between gap-5">
              <div className="max-w-xl">
                <h1 className="text-2xl font-black sm:text-3xl">
                  Operations dashboard
                </h1>
                <p className="mt-1 max-w-xl text-sm text-emerald-100">
                  Create live routes and departures for AddisGo riders.
                </p>
              </div>
              <button
                className="rounded-xl bg-[#f1bd3d] px-5 py-3 font-bold text-[#102a24]"
                onClick={() => setAdding((value) => !value)}
                type="button"
              >
                {adding ? "Close form" : "+ Add live trip"}
              </button>
            </div>
          </div>
          <div className="flex flex-col">
            <div className="order-1 mt-4 rounded-2xl border border-[#dbe7df] bg-white p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#e4f4ea] text-lg">
                  🔐
                </span>
                <div>
                  <label className="block text-sm font-black">
                    Secure operator access
                  </label>
                  <p className="text-xs text-slate-500">
                    Unlock your live schedules and dispatch controls.
                  </p>
                </div>
              </div>
              <div className="mt-2 flex flex-col gap-3 sm:flex-row">
                <input
                  className="min-w-0 flex-1 rounded-xl border border-[#cbdcd2] px-4 py-3"
                  onChange={(event) => setKey(event.target.value)}
                  placeholder="Enter the private key from apps/api/.env"
                  type="password"
                  value={key}
                />
                <button
                  className="rounded-xl border-2 border-[#12634f] px-5 py-3 font-bold text-[#12634f] disabled:opacity-50"
                  disabled={!key || loading}
                  onClick={() => void loadTrips()}
                  type="button"
                >
                  {loading ? "Loading…" : "Open schedule"}
                </button>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                The key stays in this browser tab only.
              </p>
            </div>
            {adding && (
              <form
                id="trip-form"
                className="order-5 mt-5 grid gap-4 rounded-2xl border border-[#dbe7df] bg-white p-6 shadow-sm md:grid-cols-2"
                onSubmit={addTrip}
              >
                <div className="md:col-span-2">
                  <p className="text-xs font-black tracking-[.16em] text-[#e66d32]">
                    NEW DEPARTURE
                  </p>
                  <h2 className="mt-1 text-2xl font-black">Add a live trip</h2>
                </div>
                <Field
                  label="Route code"
                  value={form.route_code}
                  onChange={(value) => update("route_code", value)}
                  placeholder="CITY-101"
                />
                <label className="grid gap-2 text-sm font-bold">
                  Service type
                  <select
                    className="rounded-xl border border-[#cbdcd2] px-4 py-3"
                    value={form.service_type}
                    onChange={(event) =>
                      update(
                        "service_type",
                        event.target.value as Form["service_type"],
                      )
                    }
                  >
                    <option value="city">City bus</option>
                    <option value="intercity">Long distance</option>
                  </select>
                </label>
                <Field
                  label="From"
                  value={form.origin}
                  onChange={(value) => update("origin", value)}
                  placeholder="Megenagna"
                />
                <Field
                  label="From city"
                  value={form.origin_city}
                  onChange={(value) => update("origin_city", value)}
                  placeholder="Addis Ababa"
                />
                <Field
                  label="To"
                  value={form.destination}
                  onChange={(value) => update("destination", value)}
                  placeholder="Mexico Square"
                />
                <Field
                  label="To city"
                  value={form.destination_city}
                  onChange={(value) => update("destination_city", value)}
                  placeholder="Addis Ababa"
                />
                <Field
                  label="Operator"
                  value={form.operator_name}
                  onChange={(value) => update("operator_name", value)}
                  placeholder="Sheger City Bus"
                />
                <Field
                  label="Coach name"
                  value={form.coach_name}
                  onChange={(value) => update("coach_name", value)}
                  placeholder="Sheger 101"
                />
                <Field
                  label="Departure"
                  value={form.departure_at}
                  onChange={(value) => update("departure_at", value)}
                  type="datetime-local"
                />
                <Field
                  label="Arrival"
                  value={form.arrival_at}
                  onChange={(value) => update("arrival_at", value)}
                  type="datetime-local"
                />
                <Field
                  label="Fare (ETB)"
                  value={form.fare_etb}
                  onChange={(value) => update("fare_etb", value)}
                  type="number"
                  placeholder="12"
                />
                <Field
                  label="Seats"
                  value={form.capacity}
                  onChange={(value) => update("capacity", value)}
                  type="number"
                />
                <button
                  className="rounded-xl bg-[#12634f] px-5 py-3 font-bold text-white disabled:opacity-50 md:col-span-2"
                  disabled={saving || !key}
                  type="submit"
                >
                  {saving ? "Saving live trip…" : "Create live trip"}
                </button>
              </form>
            )}
            {notice && (
              <p className="order-2 mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-bold text-[#12634f]">
                {notice}
              </p>
            )}
            {key && (
              <section className="order-3 mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Metric
                  label="Scheduled trips"
                  value={loading ? "…" : String(trips.length)}
                  caption="Live in Supabase"
                  accent="bg-[#12634f]"
                />
                <Metric
                  label="Seats sold"
                  value={`${bookedSeats} / ${totalSeats || 0}`}
                  caption={`${occupancy}% occupancy`}
                  accent="bg-[#e66d32]"
                />
                <Metric
                  label="Booking revenue"
                  value={`ETB ${totalRevenue.toLocaleString()}`}
                  caption="Confirmed riders"
                  accent="bg-[#0f6e9f]"
                />
                <Metric
                  label="Available capacity"
                  value={String(Math.max(0, totalSeats - bookedSeats))}
                  caption="Seats ready to sell"
                  accent="bg-[#b87813]"
                />
              </section>
            )}
            <section
              id="departures"
              className="order-4 mt-5 overflow-hidden rounded-2xl border border-[#dbe7df] bg-white shadow-[0_10px_30px_rgba(16,42,36,.07)]"
            >
              <div className="flex items-center justify-between border-b border-[#e7eee9] p-5 sm:p-6">
                <div>
                  <h2 className="font-black">Live departures</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {key
                      ? `${trips.length} scheduled trips`
                      : "Enter your key to load the schedule"}
                    {lastUpdated &&
                      ` · Updated ${lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    className="rounded-lg border border-[#b8d7c5] px-3 py-1.5 text-xs font-black text-[#12634f] disabled:opacity-50"
                    disabled={!key || loading}
                    onClick={() => void loadTrips()}
                    type="button"
                  >
                    {loading ? "Refreshing…" : "Refresh"}
                  </button>
                  <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-[#12634f]">
                    <span className="h-2 w-2 rounded-full bg-[#13a56f]" />
                    Live
                  </span>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="bg-[#f6f8f6] text-xs font-black tracking-wide text-slate-500">
                    <tr>
                      <th className="p-4">ROUTE</th>
                      <th>JOURNEY</th>
                      <th>DEPARTURE</th>
                      <th>BOOKED</th>
                      <th>FARE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trips.map((trip) => (
                      <tr
                        className="border-t border-[#edf1ee] transition hover:bg-[#f8fbf8]"
                        key={trip.id}
                      >
                        <td className="p-4">
                          <span className="rounded-lg bg-[#e7f4eb] px-2.5 py-1.5 font-black text-[#12634f]">
                            {trip.route?.public_code}
                          </span>
                        </td>
                        <td className="py-4 font-bold">
                          {trip.route?.origin?.name} →{" "}
                          {trip.route?.destination?.name}
                          <div className="mt-1 text-xs text-slate-500">
                            {trip.route?.operator_name} · {trip.coach_name}
                          </div>
                        </td>
                        <td className="py-4 text-xs font-semibold text-slate-600">
                          {new Date(trip.departure_at).toLocaleString()}
                        </td>
                        <td className="py-4">
                          <span className="font-black text-[#12634f]">
                            {trip.bookings?.filter(
                              (booking) => booking.status !== "cancelled",
                            ).length ?? 0}{" "}
                          </span>
                          <span className="text-slate-400">
                            {" "}
                            / {trip.capacity}
                          </span>
                        </td>
                        <td className="py-4 pr-4 font-black text-[#102a24]">
                          ETB {trip.fare_etb}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
            {key && (
              <section className="order-6 mt-5 grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
                <article className="overflow-hidden rounded-2xl border border-[#dbe7df] bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <h2 className="font-black">🗺 Live route view</h2>
                    <span className="text-xs font-bold text-[#12634f]">
                      Addis Ababa
                    </span>
                  </div>
                  <div className="relative mt-4 h-40 overflow-hidden rounded-xl bg-[#e6f2e6]">
                    <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(#72b98a_1px,transparent_1px),linear-gradient(90deg,#72b98a_1px,transparent_1px)] [background-size:24px_24px]" />
                    <svg
                      className="absolute inset-0 h-full w-full"
                      viewBox="0 0 500 160"
                    >
                      <path
                        d="M35 116 C105 22,175 136,250 78 S360 15,462 92"
                        fill="none"
                        stroke="#08704d"
                        strokeDasharray="8 7"
                        strokeWidth="7"
                      />
                      <circle cx="35" cy="116" fill="#f1bd3d" r="11" />
                      <circle cx="250" cy="78" fill="#08704d" r="11" />
                      <circle cx="462" cy="92" fill="#08704d" r="11" />
                    </svg>
                    <span className="absolute left-[44%] top-[34%] rounded-full bg-white px-3 py-1 text-xs font-black shadow">
                      Live routes
                    </span>
                  </div>
                </article>
                <article className="rounded-2xl border border-[#dbe7df] bg-white p-5 shadow-sm">
                  <h2 className="font-black">⚡ Quick actions</h2>
                  <div className="mt-4 grid grid-cols-3 gap-3">
                    <button
                      className="rounded-xl bg-[#eaf6ee] p-3 text-xs font-black text-[#12634f]"
                      onClick={() => goTo("departures")}
                      type="button"
                    >
                      ▤<br />
                      Schedule
                    </button>
                    <button
                      className="rounded-xl bg-[#fff4cc] p-3 text-xs font-black text-[#8a5b00]"
                      onClick={() => {
                        setAdding(true);
                        goTo("trip-form");
                      }}
                      type="button"
                    >
                      ＋<br />
                      New trip
                    </button>
                    <a
                      className="rounded-xl bg-[#e9f3ff] p-3 text-center text-xs font-black text-[#0f6e9f]"
                      href="/bookings"
                    >
                      ▥<br />
                      Bookings
                    </a>
                  </div>
                </article>
              </section>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function Field({
  label,
  onChange,
  placeholder,
  type = "text",
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  value: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-bold">
      {label}
      <input
        className="rounded-xl border border-[#cbdcd2] px-4 py-3"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required
        type={type}
        value={value}
      />
    </label>
  );
}

function Metric({
  accent,
  caption,
  label,
  value,
}: {
  accent: string;
  caption: string;
  label: string;
  value: string;
}) {
  return (
    <article className="relative overflow-hidden rounded-xl border border-white bg-white p-4 shadow-[0_6px_18px_rgba(16,42,36,.06)]">
      <span className={`absolute left-0 top-0 h-full w-1 ${accent}`} />
      <p className="pl-2 text-[10px] font-black uppercase tracking-[.12em] text-slate-500">
        {label}
      </p>
      <p className="mt-1 pl-2 text-xl font-black tracking-tight text-[#102a24]">
        {value}
      </p>
      <p className="pl-2 text-[11px] font-semibold text-slate-500">{caption}</p>
    </article>
  );
}
