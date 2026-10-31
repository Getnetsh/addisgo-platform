"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type BookingInput = { tripId: string; seatNumber: string; passengerName: string; passengerPhone: string; totalAmount: number };
type BookingResult = { success: true; reference: string } | { success: false; message: string };

export async function createBooking(input: BookingInput): Promise<BookingResult> {
  if (!input.tripId || !input.seatNumber || !input.passengerName || input.totalAmount < 0) return { success: false, message: "Please complete your journey and passenger details." };
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) return { success: false, message: "Supabase is not connected yet." };

  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return { success: false, message: "Please sign in before reserving a seat." };

  const { data, error } = await supabase.from("bookings").insert({
    trip_id: input.tripId,
    seat_number: input.seatNumber,
    passenger_name: input.passengerName,
    passenger_phone: input.passengerPhone,
    total_amount: input.totalAmount,
    status: "pending",
  }).select("booking_reference").single();

  if (error || !data) return { success: false, message: "That seat is no longer available. Please choose another seat." };
  revalidatePath("/");
  return { success: true, reference: data.booking_reference };
}
