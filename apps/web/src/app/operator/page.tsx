"use client";

import { type FormEvent, useEffect, useState } from "react";
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
  const activeRoutes = new Set(
    trips.map((trip) => trip.route?.public_code).filter(Boolean),
  ).size;
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
    if (adding) {
      document.getElementById("trip-form")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, [adding]);

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
    <main className={styles.shell}>
      <aside className={styles.sidebar}>
        <a className={styles.brand} href="/" aria-label="AddisGo home">
          <span className={styles.brandMark} aria-hidden="true">
            <svg viewBox="0 0 40 32">
              <path d="M7 3h26a4 4 0 0 1 4 4v17h-3a5 5 0 0 1-10 0h-8a5 5 0 0 1-10 0H3V7a4 4 0 0 1 4-4Zm1 4v9h24V7H8Zm1 15a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm20 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z" />
            </svg>
          </span>
          <span>
            Addis<span>Go</span>
            <small>OPERATOR PORTAL</small>
          </span>
        </a>
        <nav className={styles.navigation} aria-label="Operator workspace">
          <button
            className={`${styles.navItem} ${styles.navItemActive}`}
            onClick={() => goTo("overview")}
            type="button"
          >
            <span aria-hidden="true">⌂</span> Overview
          </button>
          <button
            className={styles.navItem}
            onClick={() => goTo("departures")}
            type="button"
          >
            <span aria-hidden="true">▣</span> Live departures
          </button>
          <button
            className={styles.navItem}
            onClick={() => setAdding(true)}
            type="button"
          >
            <span aria-hidden="true">✚</span> Add live trip
          </button>
          <a className={styles.navItem} href="/">
            <span aria-hidden="true">↗</span> Rider website
          </a>
        </nav>
        <div className={styles.sidebarCard}>
          <p className={styles.sidebarCardTitle}><span>◉</span> LIVE MODE</p>
          <p>Monitor routes, seats, and bookings from one place.</p>
        </div>
        <div className={styles.sidebarSpacer} />
        <div className={styles.sidebarArt} aria-hidden="true" />
        <div className={styles.sidebarUser}>
          <span className={styles.avatar}>O</span>
          <span><strong>Operator</strong><small>Operations team</small></span>
          <span className={styles.userMenu} aria-hidden="true">···</span>
        </div>
      </aside>

      <section className={styles.workspace} id="overview">
        <header className={styles.topbar}>
          <div className={styles.topbarActions}>
            <div className={styles.notificationWrap}>
              <button
                aria-expanded={notificationsOpen}
                aria-label="Operator notifications"
                className={styles.iconButton}
                onClick={() => setNotificationsOpen((open) => !open)}
                type="button"
              >
                <svg aria-hidden="true" viewBox="0 0 24 24">
                  <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
                </svg>
                <span className={styles.notificationDot} />
              </button>
              {notificationsOpen && (
                <section className={styles.notificationPanel}>
                  <div className={styles.panelHeading}>
                    <div><p className={styles.eyebrow}>INBOX</p><h2>Operator alerts</h2></div>
                    <span className={styles.liveTag}>LIVE</span>
                  </div>
                  <div className={styles.alertList}>
                    {operatorAlerts.map((alert, index) => (
                      <p key={alert}><span>{index === 2 ? "!" : "•"}</span>{alert}</p>
                    ))}
                  </div>
                  <button
                    className={styles.textButton}
                    onClick={() => {
                      setNotificationsOpen(false);
                      goTo("departures");
                    }}
                    type="button"
                  >
                    View live departures <span aria-hidden="true">→</span>
                  </button>
                </section>
              )}
            </div>
            <div className={styles.operatorProfile}>
              <span className={styles.topbarAvatar}>O</span>
              <span><strong>Operator Portal</strong><small>AddisGo</small></span>
              <span className={styles.profileChevron} aria-hidden="true">⌄</span>
            </div>
          </div>
        </header>

        <div className={styles.content}>
          <section className={styles.hero}>
            <div className={styles.heroCopy}>
              <p className={styles.eyebrow}>LIVE OPERATIONS <span className={styles.heroLiveDot} /></p>
              <h1>Operations Dashboard</h1>
              <p className={styles.heroDescription}>
                Create live routes and departures for AddisGo riders.
              </p>
            </div>
          </section>

          <section className={styles.metrics} aria-label="Operations metrics">
            <Metric label="Active trips" value={loading ? "…" : String(trips.length)} icon="▣" tone="green" />
            <Metric label="Seats available" value={String(Math.max(0, totalSeats - bookedSeats))} icon="♧" tone="green" />
            <Metric label="Confirmed bookings" value={String(bookedSeats)} icon="♟" tone="violet" />
            <Metric label="Active routes" value={String(activeRoutes)} icon="⌁" tone="blue" />
          </section>

          {notice && <p className={styles.notice} role="status">{notice}</p>}

          {adding && (
            <form id="trip-form" className={styles.tripForm} onSubmit={addTrip}>
              <div className={styles.formHeading}>
                <div><p className={styles.eyebrow}>NEW DEPARTURE</p><h2>Create a live trip</h2><p>Add route and schedule details to publish a departure.</p></div>
                <button className={styles.closeButton} onClick={() => setAdding(false)} type="button" aria-label="Close trip form">×</button>
              </div>
              <div className={styles.formGrid}>
                <Field label="Route code" value={form.route_code} onChange={(value) => update("route_code", value)} placeholder="CITY-101" />
                <label className={styles.field}>
                  Service type
                  <select
                    value={form.service_type}
                    onChange={(event) => update("service_type", event.target.value as Form["service_type"])}
                  >
                    <option value="city">City bus</option>
                    <option value="intercity">Long distance</option>
                  </select>
                </label>
                <Field label="Departure stop" value={form.origin} onChange={(value) => update("origin", value)} placeholder="Megenagna" />
                <Field label="Departure city" value={form.origin_city} onChange={(value) => update("origin_city", value)} placeholder="Addis Ababa" />
                <Field label="Destination stop" value={form.destination} onChange={(value) => update("destination", value)} placeholder="Mexico Square" />
                <Field label="Destination city" value={form.destination_city} onChange={(value) => update("destination_city", value)} placeholder="Addis Ababa" />
                <Field label="Operator" value={form.operator_name} onChange={(value) => update("operator_name", value)} placeholder="Sheger City Bus" />
                <Field label="Coach name" value={form.coach_name} onChange={(value) => update("coach_name", value)} placeholder="Sheger 101" />
                <Field label="Departure time" value={form.departure_at} onChange={(value) => update("departure_at", value)} type="datetime-local" />
                <Field label="Arrival time" value={form.arrival_at} onChange={(value) => update("arrival_at", value)} type="datetime-local" />
                <Field label="Fare (ETB)" value={form.fare_etb} onChange={(value) => update("fare_etb", value)} type="number" placeholder="12" />
                <Field label="Seat capacity" value={form.capacity} onChange={(value) => update("capacity", value)} type="number" />
              </div>
              <div className={styles.formActions}>
                <button className={styles.cancelButton} onClick={() => setAdding(false)} type="button">Cancel</button>
                <button className={styles.primaryButton} disabled={saving || !key} type="submit">
                  {saving ? "Publishing…" : "Publish departure"} <span aria-hidden="true">→</span>
                </button>
              </div>
            </form>
          )}

          <section className={styles.departuresCard} id="departures">
            <div className={styles.departuresHeader}>
              <div className={styles.departureTitle}>
                <span className={styles.departureIcon} aria-hidden="true">▣</span>
                <div>
                  <h2>Live Departures</h2>
                  <p>{key ? `${trips.length} scheduled ${trips.length === 1 ? "trip" : "trips"}` : "Enter your key to load the schedule"}</p>
                </div>
              </div>
              <div className={styles.departureActions}>
                <button className={styles.refreshButton} disabled={!key || loading} onClick={() => void loadTrips()} type="button">
                  <span aria-hidden="true">↻</span> {loading ? "Refreshing…" : "Refresh"}
                </button>
                <span className={styles.liveTag}><span /> Live</span>
              </div>
            </div>
            {!key && (
              <form
                className={styles.scheduleConnect}
                onSubmit={(event) => {
                  event.preventDefault();
                  void loadTrips();
                }}
              >
                <label className={styles.srOnly} htmlFor="operator-key">Private operator key</label>
                <div className={styles.keyInputWrap}>
                  <span aria-hidden="true">⌑</span>
                  <input
                    autoComplete="off"
                    id="operator-key"
                    onChange={(event) => setKey(event.target.value)}
                    placeholder="Paste your private operator key"
                    type="password"
                    value={key}
                  />
                </div>
                <button className={styles.secondaryButton} disabled={!key || loading} type="submit">
                  {loading ? "Connecting…" : "Load schedule"}
                </button>
              </form>
            )}
            {trips.length ? (
              <div className={styles.tableWrap}>
                <table className={styles.departureTable}>
                  <thead><tr><th>ROUTE</th><th>JOURNEY</th><th>DEPARTURE</th><th>BOOKED</th><th>FARE</th><th>STATUS</th></tr></thead>
                  <tbody>
                    {trips.map((trip) => {
                      const booked = trip.bookings?.filter((booking) => booking.status !== "cancelled").length ?? 0;
                      return (
                        <tr key={trip.id}>
                          <td><span className={styles.routeCode}>{trip.route?.public_code ?? "—"}</span></td>
                          <td><strong>{trip.route?.origin?.name ?? "Origin"} <span aria-hidden="true">→</span> {trip.route?.destination?.name ?? "Destination"}</strong><small>{trip.route?.operator_name ?? "Operator"} · {trip.coach_name}</small></td>
                          <td><strong>{new Date(trip.departure_at).toLocaleDateString([], { day: "2-digit", month: "short" })}</strong><small>{new Date(trip.departure_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</small></td>
                          <td><strong>{booked} <span className={styles.seatTotal}>/ {trip.capacity}</span></strong></td>
                          <td><strong>ETB {trip.fare_etb}</strong></td>
                          <td><span className={styles.departureStatus}><span /> Scheduled</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className={styles.emptyState}>
                <span className={styles.emptyIcon}>◷</span>
                <h3>{loading ? "Loading your schedule…" : key ? "No departures yet" : "Your schedule is waiting"}</h3>
                <p>{loading ? "Fetching the latest operator data." : key ? "Create your first trip to start selling seats." : "Connect with your operator key above to see live departures and manage your fleet."}</p>
                {key && !loading && <button className={styles.textButton} onClick={() => setAdding(true)} type="button">Create your first trip <span aria-hidden="true">→</span></button>}
              </div>
            )}
            <div className={styles.tableFooter}>
              <span>{lastUpdated ? `Last synced at ${lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "Waiting for schedule connection"}</span>
              <a href="/bookings">View all bookings <span aria-hidden="true">→</span></a>
            </div>
          </section>

          <section className={styles.createStrip}>
            <div className={styles.createIntro}>
              <span className={styles.createIcon} aria-hidden="true">▦<b>＋</b></span>
              <div>
                <p className={styles.createEyebrow}>NEW DEPARTURE</p>
                <h2>Add a live trip</h2>
                <p>Create a new route or departure to go live immediately.</p>
              </div>
            </div>
            <div className={styles.createPreview}>
              <label>
                <small>ROUTE CODE</small>
                <input
                  onChange={(event) => update("route_code", event.target.value)}
                  placeholder="e.g. R1"
                  value={form.route_code}
                />
              </label>
              <label>
                <small>DEPARTURE TIME</small>
                <input
                  onChange={(event) => update("departure_at", event.target.value)}
                  type="datetime-local"
                  value={form.departure_at}
                />
              </label>
              <label>
                <small>CAPACITY</small>
                <input
                  min="1"
                  onChange={(event) => update("capacity", event.target.value)}
                  placeholder="e.g. 50"
                  type="number"
                  value={form.capacity}
                />
              </label>
            </div>
            <button className={styles.stripButton} onClick={() => setAdding(true)} type="button">
              <span aria-hidden="true">＋</span> Continue trip setup
            </button>
          </section>

          <footer className={styles.footer}>
            <span>ADDISGO <i /> OPERATOR CONSOLE</span>
            <span>Every journey starts here.</span>
          </footer>
        </div>
      </section>
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
    <label className={styles.field}>
      {label}
      <input
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
  icon,
  label,
  tone,
  value,
}: {
  icon: string;
  label: string;
  tone: "green" | "gold" | "blue" | "violet";
  value: string;
}) {
  return (
    <article className={styles.metricCard}>
      <div className={`${styles.metricIcon} ${styles[tone]}`} aria-hidden="true">{icon}</div>
      <div className={styles.metricInfo}>
        <p>{label}</p>
        <strong>{value}</strong>
      </div>
    </article>
  );
}
