import type { Trip } from "./types";

export const cityTrips: Trip[] = [
  {
    id: "city-101",
    route: "Route 101",
    operator: "Sheger City Bus",
    fare: "ETB 12",
    departure: "08:10",
    duration: "32 min",
    seats: 32,
    from: "Megenagna",
    to: "Mexico Square",
  },
  {
    id: "city-74",
    route: "Route 74",
    operator: "Anbessa City Bus",
    fare: "ETB 10",
    departure: "08:25",
    duration: "40 min",
    seats: 28,
    from: "Piassa",
    to: "Bole",
  },
  {
    id: "city-22",
    route: "Route 22",
    operator: "Sheger City Bus",
    fare: "ETB 12",
    departure: "13:15",
    duration: "28 min",
    seats: 19,
    from: "Mexico Square",
    to: "Lideta",
  },
  {
    id: "city-16",
    route: "Route 16",
    operator: "Anbessa City Bus",
    fare: "ETB 10",
    departure: "18:10",
    duration: "35 min",
    seats: 16,
    from: "Bole",
    to: "Megenagna",
  },
];

export const longTrips: Trip[] = [
  {
    id: "long-hawassa",
    route: "Addis Ababa → Hawassa",
    operator: "Selam Bus",
    fare: "ETB 650",
    departure: "06:30",
    duration: "5h 30m",
    seats: 32,
    from: "Addis Ababa",
    to: "Hawassa",
  },
  {
    id: "long-bahir-dar",
    route: "Addis Ababa → Bahir Dar",
    operator: "Sky Bus",
    fare: "ETB 900",
    departure: "07:00",
    duration: "9h",
    seats: 28,
    from: "Addis Ababa",
    to: "Bahir Dar",
  },
];

export const seats = [
  "1A",
  "1B",
  "1C",
  "1D",
  "2A",
  "2B",
  "2C",
  "2D",
  "3A",
  "3B",
  "3C",
  "3D",
];
export const occupiedSeats = new Set(["1B", "2C", "3A"]);
export const cityStops = [
  "Megenagna",
  "Mexico Square",
  "Piassa",
  "Bole",
  "Lideta",
];
export const longStops = [
  "Addis Ababa",
  "Hawassa",
  "Bahir Dar",
  "Dire Dawa",
  "Adama",
];
export const destinationImages = {
  Hawassa: require("../assets/destinations/hawassa.png"),
  "Bahir Dar": require("../assets/destinations/bahir-dar.png"),
  "Dire Dawa": require("../assets/destinations/dire-dawa.png"),
};
export const ticketsKey = "@addisgo/tickets";
export const riderKey = "@addisgo/rider";
export const notificationsKey = "@addisgo/notifications";
