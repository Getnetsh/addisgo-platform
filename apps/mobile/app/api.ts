const apiUrl = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, "");

type ApiTrip = {
  id: string;
  departure_at: string;
  arrival_at: string;
  fare_etb: number;
  coach_name: string;
  capacity: number;
  route?: {
    service_type?: string;
    public_code?: string;
    operator_name?: string;
    origin?: { name?: string; city?: string };
    destination?: { name?: string; city?: string };
  };
};

export type RemoteTrip = {
  id: string;
  route: string;
  operator: string;
  fare: string;
  departure: string;
  duration: string;
  seats: number;
  from: string;
  to: string;
  service: "city" | "long";
};

function requireApiUrl(): string {
  if (!apiUrl) {
    throw new Error("API URL is not configured.");
  }
  return apiUrl;
}

function formatTime(value: string): string {
  return new Date(value).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function duration(start: string, end: string): string {
  const minutes = Math.max(
    1,
    Math.round((Date.parse(end) - Date.parse(start)) / 60000),
  );
  const hours = Math.floor(minutes / 60);
  return hours ? `${hours}h ${minutes % 60}m` : `${minutes} min`;
}

export async function loadTrips(): Promise<RemoteTrip[]> {
  const response = await fetch(`${requireApiUrl()}/trips`);
  if (!response.ok) throw new Error("Trips are unavailable.");
  const records = (await response.json()) as ApiTrip[];
  return records.map((trip) => {
    const route = trip.route ?? {};
    const usesStops = route.service_type === "city";
    const origin = usesStops
      ? (route.origin?.name ?? route.origin?.city ?? "Addis Ababa")
      : (route.origin?.city ?? route.origin?.name ?? "Addis Ababa");
    const destination =
      (usesStops ? route.destination?.name : route.destination?.city) ??
      route.destination?.name ??
      "Destination";
    return {
      id: trip.id,
      route: route.public_code ?? `${origin} → ${destination}`,
      operator: route.operator_name ?? trip.coach_name,
      fare: `ETB ${trip.fare_etb}`,
      departure: formatTime(trip.departure_at),
      duration: duration(trip.departure_at, trip.arrival_at),
      seats: trip.capacity,
      from: origin,
      to: destination,
      service: route.service_type === "city" ? "city" : "long",
    };
  });
}

export async function createDemoSession(
  phone: string,
): Promise<{ user_id: string; phone: string }> {
  const response = await fetch(`${requireApiUrl()}/demo/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone }),
  });
  if (!response.ok)
    throw new Error(
      (await response.json()).detail ?? "Sign-in is unavailable.",
    );
  return response.json();
}

export async function createDemoBooking(input: {
  userId: string;
  tripId: string;
  seatNumber: string;
  phone: string;
  holdToken?: string;
}): Promise<{ reference: string; total_amount: number }> {
  const response = await fetch(`${requireApiUrl()}/demo/bookings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Demo-User-Id": input.userId,
    },
    body: JSON.stringify({
      trip_id: input.tripId,
      seat_number: input.seatNumber,
      passenger_name: "AddisGo Rider",
      passenger_phone: input.phone,
      hold_token: input.holdToken,
    }),
  });
  if (!response.ok)
    throw new Error(
      (await response.json()).detail ?? "Booking is unavailable.",
    );
  return response.json();
}

export async function createDemoSeatHold(input: {
  userId: string;
  tripId: string;
  seatNumber: string;
}): Promise<{ hold_token: string; expires_at: string }> {
  const response = await fetch(`${requireApiUrl()}/demo/seat-holds`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Demo-User-Id": input.userId,
    },
    body: JSON.stringify({
      trip_id: input.tripId,
      seat_number: input.seatNumber,
    }),
  });
  if (!response.ok) {
    const body = (await response.json()) as { detail?: string };
    throw new Error(body.detail ?? "The seat is unavailable.");
  }
  return response.json();
}

export async function releaseDemoSeatHold(input: {
  userId: string;
  holdToken: string;
}): Promise<void> {
  await fetch(`${requireApiUrl()}/demo/seat-holds/${input.holdToken}`, {
    method: "DELETE",
    headers: { "X-Demo-User-Id": input.userId },
  });
}

export function isApiConfigured(): boolean {
  return Boolean(apiUrl);
}
