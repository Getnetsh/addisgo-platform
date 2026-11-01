"use client";

import { useEffect, useMemo, useState } from "react";
import { createBooking } from "@/app/actions";
import { createClient } from "@/lib/supabase/client";
import type { ServiceType, Trip } from "@addisgo/types";

const previewTrips: Trip[] = [
  { id: "demo-city-101", service: "city", label: "Route 101", operator: "Sheger City Bus", departure: "08:10", arrival: "08:42", duration: "32 min", origin: "Megenagna", destination: "Mexico Square", fare: 12, seats: 9, tag: "Frequent service", coach: "Standard city bus" },
  { id: "demo-city-074", service: "city", label: "Route 74", operator: "Anbessa City Bus", departure: "08:25", arrival: "09:02", duration: "37 min", origin: "Megenagna", destination: "Mexico Square", fare: 10, seats: 14, tag: "Low crowding", coach: "Standard city bus" },
  { id: "demo-city-033", service: "city", label: "Route 33", operator: "Sheger City Bus", departure: "08:40", arrival: "09:15", duration: "35 min", origin: "Megenagna", destination: "Mexico Square", fare: 12, seats: 6, tag: "Limited seats", coach: "Standard city bus" },
  { id: "demo-intercity-001", service: "intercity", label: "Addis → Bahir Dar", operator: "Selam Bus", departure: "06:30", arrival: "15:10", duration: "8h 40m", origin: "Addis Ababa Bus Terminal", destination: "Bahir Dar Bus Station", fare: 980, seats: 11, tag: "Wi-Fi on board", coach: "Executive coach" },
  { id: "demo-intercity-002", service: "intercity", label: "Addis → Bahir Dar", operator: "Sky Bus Ethiopia", departure: "07:15", arrival: "16:05", duration: "8h 50m", origin: "Addis Ababa Bus Terminal", destination: "Bahir Dar Bus Station", fare: 895, seats: 18, tag: "Best value", coach: "Comfort coach" },
  { id: "demo-intercity-003", service: "intercity", label: "Addis → Bahir Dar", operator: "Abay Bus", departure: "08:00", arrival: "16:55", duration: "8h 55m", origin: "Addis Ababa Bus Terminal", destination: "Bahir Dar Bus Station", fare: 850, seats: 7, tag: "7 seats left", coach: "Standard coach" },
];
const seats = ["1A", "1B", "1C", "1D", "2A", "2B", "2C", "2D"];
const unavailableSeats = new Set(["1B", "2C"]);
const formatFare = (fare: number) => new Intl.NumberFormat("en-US").format(fare);
const copy = {
  EN: { find: "Find a bus", how: "How it works", help: "Help", signIn: "Sign in", city: "City bus", long: "Long distance", heroTag: "ETHIOPIA'S BUS TRAVEL COMPANION", heroTitle: "Your journey starts in Addis.", heroText: "Find reliable city buses and reserve long-distance coach travel in one calm, simple place.", fares: "Clear ETB fares", seats: "Easy seat choice", operators: "Local operators", search: "Search routes", preview: "Preview schedule · connect operators for live times", featured: "FEATURED ROUTES", found: "ROUTES FOUND", cityHeading: "Get around Addis Ababa", longHeading: "Travel beyond Addis Ababa", refresh: "Refresh search", simple: "SIMPLE FROM SEARCH TO SEAT", uncertainty: "Travel with less uncertainty.", operatorTitle: "Built for every kind of journey.", operatorText: "AddisGo gives riders, bus operators and terminals a shared view of travel.", operatorButton: "I'm a bus operator" },
  "አማ": { find: "አውቶቡስ ይፈልጉ", how: "እንዴት እንደሚሠራ", help: "እርዳታ", signIn: "ግባ", city: "የከተማ አውቶቡስ", long: "ረጅም ርቀት", heroTag: "የኢትዮጵያ የአውቶቡስ ጉዞ መተግበሪያ", heroTitle: "ጉዞዎ ከአዲስ አበባ ይጀምራል።", heroText: "የከተማ አውቶቡሶችን ያግኙ እና የረጅም ርቀት ጉዞዎን በቀላሉ ያስይዙ።", fares: "ግልጽ የብር ዋጋ", seats: "ቀላል መቀመጫ ምርጫ", operators: "የአካባቢ ኦፕሬተሮች", search: "መስመሮችን ፈልግ", preview: "የሙከራ መርሐ ግብር · ለቀጥታ ሰዓት ኦፕሬተሮችን ያገናኙ", featured: "ተመራጭ መስመሮች", found: "የተገኙ መስመሮች", cityHeading: "በአዲስ አበባ ይጓዙ", longHeading: "ከአዲስ አበባ ውጭ ይጓዙ", refresh: "ፍለጋን አድስ", simple: "ከፍለጋ እስከ መቀመጫ ቀላል", uncertainty: "በልበ ሙሉነት ይጓዙ።", operatorTitle: "ለእያንዳንዱ ጉዞ የተሠራ።", operatorText: "AddisGo መንገደኞችን፣ ኦፕሬተሮችን እና ተርሚናሎችን በአንድ ቦታ ያገናኛል።", operatorButton: "እኔ የአውቶቡስ ኦፕሬተር ነኝ" },
} as const;

export default function BookingExperience() {
  const [service, setService] = useState<ServiceType>("city");
  const [searched, setSearched] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [selectedSeat, setSelectedSeat] = useState("1A");
  const [isBooking, setIsBooking] = useState(false);
  const [notice, setNotice] = useState("");
  const [language, setLanguage] = useState<"EN" | "አማ">("EN");
  const [liveTrips, setLiveTrips] = useState<Trip[]>([]);
  const [scheduleState, setScheduleState] = useState<"loading" | "live" | "preview">("loading");
  const [authOpen, setAuthOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [authStatus, setAuthStatus] = useState("");
  const [demoSignedIn, setDemoSignedIn] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentState, setPaymentState] = useState<"ready" | "processing" | "success">("ready");
  const t = copy[language];
  const allTrips = liveTrips.length ? liveTrips : previewTrips;
  const activeTrips = useMemo(() => allTrips.filter((trip) => trip.service === service), [allTrips, service]);
  const routeCopy = service === "city"
    ? { from: "Megenagna", to: "Mexico Square", date: "Today · 30 Oct" }
    : { from: "Addis Ababa Bus Terminal", to: "Bahir Dar Bus Station", date: "Sat · 31 Oct" };

  useEffect(() => {
    setDemoSignedIn(window.localStorage.getItem("addisgo-demo-signed-in") === "true");
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
    fetch(`${apiUrl}/api/v1/trips`)
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("Schedule unavailable")))
      .then((items: unknown[]) => {
        const mapped = items.map(toTrip).filter((trip): trip is Trip => trip !== null);
        if (mapped.length) { setLiveTrips(mapped); setScheduleState("live"); }
        else setScheduleState("preview");
      })
      .catch(() => setScheduleState("preview"));
  }, []);

  function selectService(nextService: ServiceType) {
    setService(nextService); setSearched(false); setSelectedTrip(null); setNotice("");
  }
  function saveDemoBooking(trip: Trip) {
    const reference = `AG-${trip.id.slice(-5).toUpperCase()}-${selectedSeat}`;
    const current = JSON.parse(window.localStorage.getItem("addisgo-demo-bookings") ?? "[]") as Array<Record<string, unknown>>;
    const booking = { reference, route: `${trip.origin} → ${trip.destination}`, departure: trip.departure, seat: selectedSeat, fare: trip.fare, coach: trip.coach, status: "Confirmed", createdAt: new Date().toISOString() };
    window.localStorage.setItem("addisgo-demo-bookings", JSON.stringify([booking, ...current.filter((item) => item.reference !== reference)]));
    window.localStorage.setItem("addisgo-last-ticket", reference);
    return reference;
  }
  async function confirmBooking() {
    if (!selectedTrip) return;
    if (!demoSignedIn) { setAuthOpen(true); setAuthStatus("Sign in with the WhatsApp demo before booking."); return; }
    if (service === "intercity") { setPaymentState("ready"); setPaymentOpen(true); return; }
    setIsBooking(true); setNotice("");
    window.setTimeout(() => {
      const reference = saveDemoBooking(selectedTrip);
      setNotice(`Booking saved. Your ticket code is ${reference}. Open My Bookings to view it.`);
      setIsBooking(false);
    }, 700);
  }
  function completeSimulation() {
    setPaymentState("processing");
    window.setTimeout(() => {
      if (selectedTrip) saveDemoBooking(selectedTrip);
      setPaymentState("success");
      setNotice(`Simulation successful. Ticket AG-${selectedTrip?.id.slice(-5).toUpperCase() ?? "DEMO"}-${selectedSeat} is ready.`);
    }, 1200);
  }
  async function requestOtp() {
    if (!phone.startsWith("+251")) { setAuthStatus("Use your number in this format: +2519XXXXXXXX"); return; }
    setAuthStatus("WhatsApp demo sign-in successful. No real message was sent.");
    window.localStorage.setItem("addisgo-demo-signed-in", "true");
    setDemoSignedIn(true);
    setNotice("Demo sign-in complete. You can now continue booking.");
    window.setTimeout(() => setAuthOpen(false), 700);
  }
  async function verifyOtp() {
    if (!otp.trim()) { setAuthStatus("Enter the 6-digit code sent to your phone."); return; }
    const { error } = await createClient().auth.verifyOtp({ phone, token: otp.trim(), type: "sms" });
    setAuthStatus(error ? error.message : "You are signed in. You can now make bookings.");
  }

  return <main className="page-shell min-h-screen bg-[var(--paper)]">
    <header className="border-b border-white/10 bg-[var(--green-dark)] text-white">
      <div className="content-width flex h-18 items-center justify-between gap-5 py-3">
        <a className="flex items-center gap-2.5" href="#top" aria-label="AddisGo home"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--gold)] text-lg font-black text-[var(--green-dark)]">A</span><span className="text-xl font-bold tracking-tight">AddisGo</span></a>
        <nav className="hidden items-center gap-7 text-sm text-emerald-50 md:flex"><a className="transition hover:text-[var(--gold)]" href="#routes">{t.find}</a><a className="transition hover:text-[var(--gold)]" href="#how-it-works">{t.how}</a><a className="transition hover:text-[var(--gold)]" href="/ticket">{language === "EN" ? "My ticket" : "ቲኬቴ"}</a><a className="transition hover:text-[var(--gold)]" href="#support">{t.help}</a></nav>
        <div className="flex items-center gap-2"><button aria-label="Switch language" className="rounded-lg border border-white/20 px-2.5 py-1.5 text-xs font-bold transition hover:bg-white/10" onClick={() => setLanguage(language === "EN" ? "አማ" : "EN")} type="button">{language === "EN" ? "አማ" : "EN"}</button><button className="rounded-lg bg-white px-3.5 py-2 text-sm font-bold text-[var(--green-dark)] transition hover:bg-emerald-50" onClick={() => { if (!demoSignedIn) { setAuthOpen(true); setAuthStatus(""); } }} type="button">{demoSignedIn ? (language === "EN" ? "Signed in" : "ገብተዋል") : t.signIn}</button></div>
      </div>
    </header>

    <section id="top" className="hero-glow relative text-white">
      <div className="content-width grid gap-10 py-15 lg:grid-cols-[1.14fr_.86fr] lg:py-20">
        <div className="max-w-2xl"><div className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/12 px-3 py-1.5 text-xs font-bold tracking-wide text-emerald-50"><span className="h-2 w-2 rounded-full bg-[var(--gold)]" />{t.heroTag}</div><h1 className="max-w-xl text-4xl font-bold leading-[1.06] tracking-tight sm:text-5xl">{t.heroTitle}</h1><p className="mt-5 max-w-lg text-base leading-7 text-emerald-50 sm:text-lg">{t.heroText}</p><div className="mt-7 flex flex-wrap gap-x-6 gap-y-3 text-sm text-emerald-50"><span>✓ {t.fares}</span><span>✓ {t.seats}</span><span>✓ {t.operators}</span></div></div>
        <aside className="map-grid relative min-h-70 overflow-hidden rounded-3xl border border-white/15 p-5 shadow-2xl"><div className="absolute inset-0 bg-gradient-to-tr from-emerald-950/25 to-transparent" /><div className="relative flex items-start justify-between"><div className="rounded-xl bg-white/95 px-3 py-2 text-xs font-bold text-[var(--green-dark)] shadow-sm">Live city movement</div><div className="rounded-full bg-[var(--green-dark)] px-3 py-1.5 text-xs font-bold text-white">Addis Ababa</div></div><div className="relative mx-auto mt-8 h-34 w-72 max-w-full"><svg viewBox="0 0 310 145" className="h-full w-full" aria-label="Illustrated bus route map" role="img"><path d="M20 104 C75 104, 74 40, 146 56 S201 119, 278 39" fill="none" stroke="#f1bd3d" strokeWidth="6" strokeLinecap="round" strokeDasharray="9 8" /><path d="M29 35 C92 22, 138 116, 284 99" fill="none" stroke="#70c79e" strokeWidth="4" strokeLinecap="round" opacity=".9" /><circle cx="20" cy="104" r="8" fill="#fffdf6" /><circle cx="278" cy="39" r="8" fill="#fffdf6" /><g transform="translate(150 67)"><rect width="48" height="28" rx="7" fill="#fffdf6" /><rect x="7" y="6" width="26" height="8" rx="2" fill="#12634f" /><circle cx="11" cy="26" r="4" fill="#102a24" /><circle cx="38" cy="26" r="4" fill="#102a24" /></g></svg></div><div className="relative mt-2 grid grid-cols-2 gap-3"><Stat value="17" label="buses nearby" /><Stat value="3 min" label="next departure" pulse /></div></aside>
      </div>
    </section>

    <section className="content-width relative z-10 -mt-8" aria-label="Trip search"><div className="soft-shadow rounded-3xl bg-white p-4 sm:p-6"><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div className="flex rounded-xl bg-emerald-50 p-1"><button className={`rounded-lg px-4 py-2 text-sm font-bold transition ${service === "city" ? "bg-[var(--green)] text-white shadow-sm" : "text-[var(--green-dark)] hover:bg-white"}`} onClick={() => selectService("city")} type="button">{t.city}</button><button className={`rounded-lg px-4 py-2 text-sm font-bold transition ${service === "intercity" ? "bg-[var(--green)] text-white shadow-sm" : "text-[var(--green-dark)] hover:bg-white"}`} onClick={() => selectService("intercity")} type="button">{t.long}</button></div><span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800">{t.preview}</span></div><div className="grid gap-3 lg:grid-cols-[1fr_1fr_.82fr_auto]"><SearchField label={language === "EN" ? "From" : "መነሻ"} value={routeCopy.from} marker="from" /><SearchField label={language === "EN" ? "To" : "መድረሻ"} value={routeCopy.to} marker="to" /><SearchField label={language === "EN" ? "Travel date" : "የጉዞ ቀን"} value={routeCopy.date} marker="date" /><button className="rounded-xl bg-[var(--orange)] px-6 py-4 font-bold text-white shadow-lg shadow-orange-200 transition hover:-translate-y-0.5 hover:bg-[#d95f27]" onClick={() => setSearched(true)} type="button">{t.search}</button></div></div></section>

    <section id="routes" className="content-width py-15"><div className="mb-7 flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold tracking-[.16em] text-[var(--orange)]">{searched ? t.found : t.featured}</p><h2 className="mt-2 text-3xl font-bold tracking-tight text-[var(--ink)]">{service === "city" ? t.cityHeading : t.longHeading}</h2><p className="mt-2 text-sm text-[var(--muted)]">{routeCopy.from} to {routeCopy.to} · {routeCopy.date}</p></div><button className="text-sm font-bold text-[var(--green)] underline decoration-2 underline-offset-4" onClick={() => setSearched(true)} type="button">{t.refresh}</button></div><div className="grid gap-4">{activeTrips.map((trip) => <TripCard key={trip.id} trip={trip} selected={selectedTrip?.id === trip.id} onSelect={() => { setSelectedTrip(trip); setNotice(""); }} />)}</div></section>

    <section className="content-width pb-15"><div className="rounded-3xl border border-amber-100 bg-amber-50 p-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold tracking-[.16em] text-[var(--orange)]">{language === "EN" ? "TRAVEL ALERTS · SAMPLE" : "የጉዞ ማሳወቂያዎች · ሙከራ"}</p><h2 className="mt-2 text-2xl font-bold">{language === "EN" ? "Know before you go" : "ከመጓዝዎ በፊት ይወቁ"}</h2></div><span className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-emerald-800">{language === "EN" ? "Updated 08:00" : "08:00 ተዘምኗል"}</span></div><div className="mt-5 grid gap-3 md:grid-cols-3"><Alert title={language === "EN" ? "City Route 101" : "የከተማ መስመር 101"} text={language === "EN" ? "Normal service · next bus in 3 min" : "መደበኛ አገልግሎት · ቀጣይ አውቶቡስ በ3 ደቂቃ"} tone="green"/><Alert title={language === "EN" ? "Addis → Bahir Dar" : "አዲስ አበባ → ባህር ዳር"} text={language === "EN" ? "Arrive 30 min early for boarding" : "ለመሳፈር 30 ደቂቃ ቀድመው ይድረሱ"} tone="orange"/><Alert title={language === "EN" ? "Ticket reminder" : "የቲኬት ማሳሰቢያ"} text={language === "EN" ? "Keep your booking code ready" : "የማስያዣ ኮድዎን ያዘጋጁ"} tone="blue"/></div></div></section>

    <section id="how-it-works" className="border-y border-[var(--line)] bg-[#eef4ed] py-15"><div className="content-width"><div className="max-w-xl"><p className="text-xs font-bold tracking-[.16em] text-[var(--orange)]">{t.simple}</p><h2 className="mt-2 text-3xl font-bold tracking-tight">{t.uncertainty}</h2></div><div className="mt-9 grid gap-4 md:grid-cols-3"><Step number="01" title={language === "EN" ? "Find your route" : "መስመርዎን ያግኙ"} text={language === "EN" ? "Compare departure times, operators, stops and ETB fares." : "የመነሻ ሰዓት፣ ኦፕሬተሮች፣ ማቆሚያዎች እና ዋጋዎችን ያነጻጽሩ።"} /><Step number="02" title={language === "EN" ? "Choose your seat" : "መቀመጫ ይምረጡ"} text={language === "EN" ? "See availability before you travel." : "ከመጓዝዎ በፊት የሚገኙ መቀመጫዎችን ይመልከቱ።"} /><Step number="03" title={language === "EN" ? "Keep your ticket" : "ቲኬትዎን ያስቀምጡ"} text={language === "EN" ? "Your confirmation stays together in your account." : "ማረጋገጫዎ በመለያዎ ውስጥ ይቀመጣል።"} /></div></div></section>
    <section id="support" className="content-width py-14"><div className="flex flex-col items-start justify-between gap-6 rounded-3xl bg-[var(--green-dark)] p-7 text-white sm:flex-row sm:items-center sm:p-9"><div><h2 className="text-2xl font-bold">Built for every kind of journey.</h2><p className="mt-2 max-w-xl text-sm leading-6 text-emerald-100">AddisGo gives riders, bus operators and terminals a shared view of travel.</p></div><button className="rounded-xl bg-[var(--gold)] px-5 py-3 text-sm font-bold text-[var(--green-dark)] transition hover:bg-amber-300" onClick={() => setNotice("Operator onboarding will be available with your Supabase project.")} type="button">I&apos;m a bus operator</button></div></section>

    {selectedTrip && <section className="fixed inset-x-0 bottom-0 z-30 border-t border-emerald-900/10 bg-white/96 shadow-[0_-12px_32px_rgba(17,62,49,.16)] backdrop-blur"><div className="content-width grid gap-4 py-4 md:grid-cols-[1fr_auto_auto] md:items-center"><div><div className="text-xs font-bold tracking-wide text-[var(--orange)]">{service === "city" ? "JOURNEY SELECTED" : "SEAT SELECTION"}</div><div className="mt-1 font-bold">{selectedTrip.label} · {selectedTrip.departure} · ETB {formatFare(selectedTrip.fare)}</div></div><div className="flex flex-wrap gap-2" aria-label="Select a seat">{seats.map((seat) => <button aria-label={`Seat ${seat}`} className={`h-8 w-9 rounded-md text-xs font-bold transition ${unavailableSeats.has(seat) ? "cursor-not-allowed bg-slate-100 text-slate-300" : selectedSeat === seat ? "bg-[var(--orange)] text-white" : "border border-[var(--line)] bg-white text-[var(--green-dark)] hover:border-[var(--green)]"}`} disabled={unavailableSeats.has(seat)} key={seat} onClick={() => setSelectedSeat(seat)} type="button">{seat}</button>)}</div><div className="flex items-center gap-3"><button className="text-sm font-bold text-[var(--muted)] underline" onClick={() => setSelectedTrip(null)} type="button">Cancel</button><button className="rounded-xl bg-[var(--green)] px-5 py-3 text-sm font-bold text-white transition hover:bg-[var(--green-dark)] disabled:opacity-60" disabled={isBooking} onClick={confirmBooking} type="button">{isBooking ? "Checking…" : service === "city" ? "Save journey" : `Reserve ${selectedSeat}`}</button></div></div></section>}
    {notice && <div className="fixed bottom-24 left-1/2 z-40 w-[min(420px,calc(100%-32px))] -translate-x-1/2 rounded-xl bg-[#102a24] px-4 py-3 text-center text-sm font-medium text-white shadow-xl" role="status">{notice}</div>}
    {paymentOpen && selectedTrip && <div className="fixed inset-0 z-50 grid place-items-center bg-emerald-950/55 p-4" role="dialog" aria-modal="true" aria-label="Telebirr payment simulation"><div className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl"><div className="bg-[#107a48] p-6 text-white"><div className="flex items-center justify-between"><div className="text-xl font-black">telebirr <span className="text-sm font-semibold opacity-80">SIMULATION</span></div><button className="text-xl" onClick={() => setPaymentOpen(false)} type="button" aria-label="Close">×</button></div><p className="mt-6 text-sm text-emerald-100">AddisGo ticket payment</p><p className="mt-1 text-3xl font-black">ETB {formatFare(selectedTrip.fare)}</p></div><div className="p-6">{paymentState === "success" ? <><div className="grid h-14 w-14 place-items-center rounded-full bg-emerald-100 text-2xl text-emerald-700">✓</div><h2 className="mt-4 text-2xl font-bold">Payment simulated</h2><p className="mt-2 text-sm leading-6 text-[var(--muted)]">Your demonstration ticket has been issued for {selectedTrip.label}, seat {selectedSeat}.</p><div className="mt-5 rounded-2xl border border-[var(--line)] bg-[var(--cream)] p-4"><div className="flex items-center justify-between"><div><p className="text-xs font-bold text-[var(--orange)]">DEMO E-TICKET</p><p className="mt-1 font-bold">{selectedTrip.origin} → {selectedTrip.destination}</p><p className="text-sm text-[var(--muted)]">{selectedTrip.departure} · Seat {selectedSeat}</p></div><div className="grid h-16 w-16 grid-cols-5 gap-0.5 bg-white p-1">{Array.from({ length: 25 }, (_, index) => <span key={index} className={(index * 7 + selectedSeat.length) % 3 ? "bg-[var(--green-dark)]" : "bg-white"} />)}</div></div></div><button className="mt-5 w-full rounded-xl bg-[var(--green)] py-3 font-bold text-white" onClick={() => { setPaymentOpen(false); setSelectedTrip(null); }} type="button">Done</button></> : <><p className="text-xs font-bold tracking-[.16em] text-[var(--orange)]">SAFE DEMONSTRATION</p><h2 className="mt-2 text-2xl font-bold">Confirm simulated payment</h2><p className="mt-2 text-sm leading-6 text-[var(--muted)]">No real payment account, phone number, or money is used. This is for testing the AddisGo journey only.</p><div className="mt-5 rounded-2xl bg-emerald-50 p-4 text-sm"><div className="flex justify-between"><span>Journey</span><strong>{selectedTrip.label}</strong></div><div className="mt-2 flex justify-between"><span>Seat</span><strong>{selectedSeat}</strong></div><div className="mt-2 flex justify-between"><span>Total</span><strong>ETB {formatFare(selectedTrip.fare)}</strong></div></div><button className="mt-5 w-full rounded-xl bg-[#107a48] py-3 font-bold text-white disabled:opacity-60" disabled={paymentState === "processing"} onClick={completeSimulation} type="button">{paymentState === "processing" ? "Processing simulation…" : "Simulate Telebirr payment"}</button><button className="mt-3 w-full text-sm font-bold text-[var(--muted)]" onClick={() => setPaymentOpen(false)} type="button">Cancel</button></>}</div></div></div>}
    {authOpen && <div className="fixed inset-0 z-50 grid place-items-center bg-emerald-950/55 p-4" role="dialog" aria-modal="true" aria-label="Phone sign in"><div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold tracking-[.16em] text-[var(--orange)]">ADDISGO ACCOUNT</p><h2 className="mt-2 text-2xl font-bold text-[var(--ink)]">{language === "EN" ? "Sign in with your phone" : "በስልክ ቁጥርዎ ይግቡ"}</h2></div><button className="text-lg text-slate-500" onClick={() => setAuthOpen(false)} type="button" aria-label="Close">×</button></div><p className="mt-3 text-sm leading-6 text-[var(--muted)]">{language === "EN" ? "We will send a one-time code. No password is needed." : "አንድ ጊዜ የሚጠቅም ኮድ እንልካለን። የይለፍ ቃል አያስፈልግም።"}</p><label className="mt-5 block text-sm font-bold text-[var(--ink)]">{language === "EN" ? "Mobile number" : "የሞባይል ቁጥር"}<input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+2519XXXXXXXX" className="mt-2 w-full rounded-xl border border-[var(--line)] bg-[var(--cream)] px-4 py-3 outline-none focus:border-[var(--green)]" /></label><button className="mt-4 w-full rounded-xl bg-[var(--green)] px-5 py-3 font-bold text-white hover:bg-[var(--green-dark)]" onClick={requestOtp} type="button">{language === "EN" ? "Send secure code" : "የደህንነት ኮድ ላክ"}</button>{authStatus && <p className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm text-[var(--green-dark)]" role="status">{authStatus}</p>}<div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900"><strong>{language === "EN" ? "Payments:" : "ክፍያ:"}</strong> {language === "EN" ? "Telebirr checkout will appear here after merchant API credentials are connected." : "የቴሌብር ክፍያ የንግድ API መረጃ ከተገናኘ በኋላ እዚህ ይታያል።"}</div></div></div>}
  </main>;
}

function SearchField({ label, value, marker }: { label: string; value: string; marker: "from" | "to" | "date" }) {
  const symbol = marker === "from" ? "●" : marker === "to" ? "◆" : "▣";
  return <label className="flex min-w-0 items-center gap-3 rounded-xl border border-[var(--line)] bg-[var(--cream)] px-4 py-3 transition focus-within:border-[var(--green)] focus-within:ring-2 focus-within:ring-emerald-100"><span className={`text-sm ${marker === "from" ? "text-[var(--green)]" : marker === "to" ? "text-[var(--orange)]" : "text-[var(--gold)]"}`}>{symbol}</span><span className="min-w-0"><span className="block text-xs font-semibold text-[var(--muted)]">{label}</span><input aria-label={label} className="mt-0.5 w-full truncate bg-transparent text-sm font-bold text-[var(--ink)] outline-none" defaultValue={value} /></span></label>;
}
function toTrip(item: unknown): Trip | null {
  if (!item || typeof item !== "object") return null;
  const value = item as { id?: string; departure_at?: string; arrival_at?: string; fare_etb?: number; coach_name?: string; capacity?: number; route?: { service_type?: ServiceType; public_code?: string; operator_name?: string; origin?: { name?: string }; destination?: { name?: string } } };
  if (!value.id || !value.departure_at || !value.arrival_at || !value.route?.service_type || !value.route.origin?.name || !value.route.destination?.name) return null;
  const departure = new Date(value.departure_at); const arrival = new Date(value.arrival_at);
  const durationMinutes = Math.max(0, Math.round((arrival.getTime() - departure.getTime()) / 60000));
  const duration = durationMinutes >= 60 ? `${Math.floor(durationMinutes / 60)}h ${durationMinutes % 60}m` : `${durationMinutes} min`;
  const time = (date: Date) => date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  return { id: value.id, service: value.route.service_type, label: value.route.service_type === "city" ? `Route ${value.route.public_code ?? ""}` : `${value.route.origin.name} → ${value.route.destination.name}`, operator: value.route.operator_name ?? "Partner operator", departure: time(departure), arrival: time(arrival), duration, origin: value.route.origin.name, destination: value.route.destination.name, fare: Number(value.fare_etb ?? 0), seats: value.capacity ?? 0, tag: "Operator schedule", coach: value.coach_name ?? "Coach" };
}
function Stat({ value, label, pulse }: { value: string; label: string; pulse?: boolean }) { return <div className="rounded-xl border border-white/65 bg-white/86 p-3 text-[var(--green-dark)]"><div className="flex items-center gap-2 text-xl font-bold">{pulse && <span className="pulse-dot h-2.5 w-2.5 rounded-full bg-[#d86631]" />}{value}</div><div className="text-xs text-slate-500">{label}</div></div>; }
function Step({ number, title, text }: { number: string; title: string; text: string }) { return <article className="rounded-2xl border border-emerald-100 bg-white p-6"><span className="text-sm font-black text-[var(--orange)]">{number}</span><h3 className="mt-5 text-xl font-bold">{title}</h3><p className="mt-2 text-sm leading-6 text-[var(--muted)]">{text}</p></article>; }
function TripCard({ trip, selected, onSelect }: { trip: Trip; selected: boolean; onSelect: () => void }) { return <article className={`card-shadow rounded-2xl border bg-white p-5 transition sm:p-6 ${selected ? "border-[var(--green)] ring-2 ring-emerald-100" : "border-[var(--line)] hover:border-emerald-300"}`}><div className="grid items-center gap-5 lg:grid-cols-[1fr_auto_auto]"><div><div className="flex flex-wrap items-center gap-2"><span className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-bold text-[var(--green)]">{trip.label}</span><span className="text-sm font-semibold text-[var(--muted)]">{trip.operator}</span><span className="rounded-full bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800">{trip.tag}</span></div><div className="mt-4 flex items-center gap-4 sm:gap-6"><div><div className="text-2xl font-bold tracking-tight">{trip.departure}</div><div className="mt-1 text-xs text-[var(--muted)]">{trip.origin}</div></div><div className="min-w-16 grow text-center"><div className="text-xs text-[var(--muted)]">{trip.duration}</div><div className="mt-1 border-t border-dashed border-[var(--green)]" /></div><div className="text-right"><div className="text-2xl font-bold tracking-tight">{trip.arrival}</div><div className="mt-1 text-xs text-[var(--muted)]">{trip.destination}</div></div></div><div className="mt-4 flex flex-wrap gap-3 text-xs text-[var(--muted)]"><span>◷ Direct route</span><span>•</span><span>{trip.coach}</span><span>•</span><span className={trip.seats < 8 ? "font-bold text-[var(--orange)]" : ""}>{trip.seats} seats left</span></div></div><div className="border-t border-[var(--line)] pt-4 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0"><div className="text-xs text-[var(--muted)]">per passenger</div><div className="mt-1 text-2xl font-bold text-[var(--green-dark)]">ETB {formatFare(trip.fare)}</div></div><button className="rounded-xl border-2 border-[var(--green)] px-5 py-3 text-sm font-bold text-[var(--green)] transition hover:bg-[var(--green)] hover:text-white" onClick={onSelect} type="button">{selected ? "Selected" : trip.service === "city" ? "View journey" : "Choose seats"}</button></div></article>; }
function Alert({ title, text, tone }: { title: string; text: string; tone: "green" | "orange" | "blue" }) { const colors = { green: "border-emerald-100 bg-white text-emerald-800", orange: "border-orange-100 bg-white text-orange-800", blue: "border-sky-100 bg-white text-sky-800" }; return <article className={`rounded-2xl border p-4 ${colors[tone]}`}><div className="text-sm font-bold">{title}</div><p className="mt-1 text-xs leading-5 text-slate-600">{text}</p></article>; }
