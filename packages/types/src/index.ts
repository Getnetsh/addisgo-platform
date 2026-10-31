export type ServiceType = "city" | "intercity";

export type Trip = {
  id: string;
  service: ServiceType;
  label: string;
  operator: string;
  departure: string;
  arrival: string;
  duration: string;
  origin: string;
  destination: string;
  fare: number;
  seats: number;
  tag: string;
  coach: string;
};

export type BookingStatus = "pending" | "confirmed" | "cancelled" | "completed";

export type Booking = {
  id: string;
  reference: string;
  tripId: string;
  seatNumber: string | null;
  passengerName: string;
  passengerPhone: string;
  totalAmount: number;
  status: BookingStatus;
};
