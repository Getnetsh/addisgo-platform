"use client";

import { useState } from "react";

const bookings = [
  { ref: "AG-BJR-031", route: "Addis Ababa → Bahir Dar", date: "31 Oct · 06:30", seat: "08", status: "Confirmed", upcoming: true },
  { ref: "AG-101-024", route: "Megenagna → Mexico Square", date: "30 Oct · 08:10", seat: "14", status: "Confirmed", upcoming: true },
  { ref: "AG-AWA-018", route: "Addis Ababa → Hawassa", date: "12 Oct · 07:00", seat: "22", status: "Completed", upcoming: false },
];

export default function BookingsPage() {
  const [am, setAm] = useState(false);
  const active = bookings.filter((booking) => booking.upcoming);
  const past = bookings.filter((booking) => !booking.upcoming);
  return <main className="min-h-screen bg-[#f5f7f3] px-5 py-8 text-[#102a24]"><div className="mx-auto max-w-3xl"><header className="flex items-center justify-between"><a href="/" className="font-bold text-[#0a4c3c]"><span className="mr-2 rounded-lg bg-[#f1bd3d] px-2 py-1">A</span>AddisGo</a><button onClick={() => setAm(!am)} className="rounded-lg border border-[#0a4c3c]/20 px-3 py-1.5 text-xs font-bold">{am ? "EN" : "አማ"}</button></header><p className="mt-10 text-xs font-bold tracking-widest text-[#e66d32]">{am ? "የእኔ ማስያዣዎች" : "MY BOOKINGS"}</p><h1 className="mt-2 text-3xl font-bold">{am ? "ቀጣይ ጉዞዎችዎ" : "Your journeys"}</h1><p className="mt-2 text-sm text-slate-600">{am ? "ይህ የሙከራ የቲኬት ዝርዝር ነው።" : "This is a sample ticket list. Sign in will connect your real bookings."}</p><section className="mt-7"><h2 className="text-lg font-bold">{am ? "ቀጣይ ጉዞ" : "Upcoming"}</h2><div className="mt-3 grid gap-3">{active.map((booking) => <BookingCard booking={booking} action={am ? "ቲኬት ይመልከቱ" : "View ticket"}/>)}</div></section><section className="mt-8"><h2 className="text-lg font-bold">{am ? "ያለፉ ጉዞዎች" : "Past journeys"}</h2><div className="mt-3 grid gap-3">{past.map((booking) => <BookingCard booking={booking} action={am ? "ዝርዝር" : "Details"}/>)}</div></section></div></main>;
}

function BookingCard({ booking, action }: { booking: typeof bookings[number]; action: string }) { return <article className="rounded-2xl bg-white p-5 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold text-[#e66d32]">{booking.ref}</p><h3 className="mt-1 text-lg font-bold">{booking.route}</h3><p className="mt-2 text-sm text-slate-600">{booking.date} · Seat {booking.seat}</p></div><span className={`rounded-full px-3 py-1 text-xs font-bold ${booking.status === "Confirmed" ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>{booking.status}</span></div><a href="/ticket" className="mt-4 inline-block text-sm font-bold text-[#12634f] underline underline-offset-4">{action} →</a></article>; }
