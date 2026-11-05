export type Service = "city" | "long";
export type Tab = "Home" | "My Trips" | "Bookings" | "Support" | "Profile";
export type TimeFilter = "Today" | "Morning" | "Afternoon" | "Evening";

export type Trip = {
  id: string;
  route: string;
  operator: string;
  fare: string;
  departure: string;
  duration: string;
  seats: number;
  from?: string;
  to?: string;
  service?: Service;
};

export type Ticket = Trip & {
  reference: string;
  seat: string;
  paidAt: string;
};

export type NotificationTone = "success" | "info" | "warning";

export type AppNotification = {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  tone: NotificationTone;
  read: boolean;
};
