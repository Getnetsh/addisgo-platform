"use client";

import { FormEvent, useState } from "react";

const tickets = {
  "AG-101-024": { rider: "Mekdes A.", route: "Megenagna → Mexico", time: "08:10", seat: "14", coach: "City 101A", status: "Ready to board" },
  "AG-BJR-031": { rider: "Yonas T.", route: "Addis Ababa → Bahir Dar", time: "06:30", seat: "08", coach: "Addis–Bahir Dar 01", status: "Ready to board" },
  "AG-AWA-018": { rider: "Selam G.", route: "Addis Ababa → Hawassa", time: "07:00", seat: "22", coach: "Addis–Hawassa 01", status: "Already boarded" },
};

export default function TicketPage() {
  const [code, setCode] = useState("AG-101-024");
  const [ticket, setTicket] = useState<(typeof tickets)[keyof typeof tickets] | null>(tickets["AG-101-024"]);
  const [am, setAm] = useState(false);
  function findTicket(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTicket(tickets[code.trim().toUpperCase() as keyof typeof tickets] ?? null);
  }
  return <main className="min-h-screen bg-[#f5f7f3] px-5 py-8 text-[#102a24]"><div className="mx-auto max-w-md"><header className="flex items-center justify-between"><a href="/" className="font-bold text-[#0a4c3c]"><span className="mr-2 rounded-lg bg-[#f1bd3d] px-2 py-1">A</span>AddisGo</a><button onClick={() => setAm(!am)} className="rounded-lg border border-[#0a4c3c]/20 px-3 py-1.5 text-xs font-bold">{am ? "EN" : "አማ"}</button></header><section className="mt-10"><p className="text-xs font-bold tracking-widest text-[#e66d32]">{am ? "የቲኬት ፍለጋ" : "TICKET LOOKUP"}</p><h1 className="mt-2 text-3xl font-bold">{am ? "የጉዞ ቲኬትዎን ያግኙ" : "Find your travel ticket"}</h1><p className="mt-2 text-sm text-slate-600">{am ? "የማስያዣ ኮድዎን ያስገቡ" : "Enter your booking code to open your boarding pass."}</p><form onSubmit={findTicket} className="mt-5 flex gap-2"><input value={code} onChange={(event) => setCode(event.target.value)} className="min-w-0 flex-1 rounded-xl border bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-[#12634f]" placeholder="AG-101-024"/><button className="rounded-xl bg-[#12634f] px-4 py-3 text-sm font-bold text-white">{am ? "ፈልግ" : "Find"}</button></form><p className="mt-3 text-xs text-slate-500">Demo: AG-101-024 · AG-BJR-031 · AG-AWA-018</p></section>{ticket ? <section className="mt-8 overflow-hidden rounded-3xl bg-[#0a4c3c] text-white shadow-xl"><div className="flex items-start justify-between p-6"><div><p className="text-xs font-bold tracking-widest text-[#f1bd3d]">ADDISGO E-TICKET</p><h2 className="mt-2 text-xl font-bold">{ticket.route}</h2><p className="mt-1 text-sm text-emerald-100">{ticket.rider} · {ticket.coach}</p></div><div className="grid h-16 w-16 grid-cols-5 gap-1 rounded-lg bg-white p-2">{Array.from({ length: 25 }, (_, index) => <i key={index} className={index % 3 === 0 || index % 7 === 0 ? "bg-[#0a4c3c]" : "bg-transparent"}/>)}</div></div><div className="grid grid-cols-2 border-y border-white/15 bg-white/5 p-6 text-sm"><div><p className="text-emerald-200">{am ? "መነሻ" : "Departure"}</p><p className="mt-1 text-lg font-bold">{ticket.time}</p></div><div><p className="text-emerald-200">{am ? "መቀመጫ" : "Seat"}</p><p className="mt-1 text-lg font-bold">{ticket.seat}</p></div></div><div className="p-6"><span className={`rounded-full px-3 py-1 text-xs font-bold ${ticket.status === "Already boarded" ? "bg-slate-400 text-slate-900" : "bg-[#f1bd3d] text-[#0a4c3c]"}`}>{ticket.status}</span><p className="mt-4 text-xs leading-5 text-emerald-100">{am ? "በሚገቡበት ጊዜ ይህን ቲኬት ለኮንዳክተሩ ያሳዩ። ይህ የሙከራ መረጃ ነው።" : "Show this ticket to the conductor when boarding. This is sample information only."}</p></div></section> : <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">{am ? "ቲኬቱ በሙከራ መረጃ ውስጥ አልተገኘም።" : "That ticket is not in the sample data."}</div>}</div></main>;
}
