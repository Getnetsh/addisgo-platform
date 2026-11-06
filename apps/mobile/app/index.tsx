import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ImageBackground,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { styles } from "./styles";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import {
  createDemoBooking,
  createDemoSeatHold,
  createDemoSession,
  isApiConfigured,
  loadTrips,
  releaseDemoSeatHold,
} from "./api";

import {
  BookingConfirmedModal,
  BottomNavigation,
  Destination,
  EmptyState,
  Legend,
  LocationModal,
  NotificationCenter,
  PaymentModal,
  ProgressLine,
  ProgressStep,
  QuickAccess,
  ReceiptCard,
  RoutePreview,
  SignInModal,
  SwitchButton,
  TicketModal,
  TripTrackingModal,
  TripCard,
  TripsEmptyState,
  UpcomingTripCard,
} from "./components";
import {
  cityStops,
  cityTrips,
  emergencyContactKey,
  longStops,
  longTrips,
  languageKey,
  recentSearchesKey,
  riderProfileKey,
  notificationsKey,
  notificationSettingsKey,
  occupiedSeats,
  riderKey,
  savedPlacesKey,
  seats,
  ticketsKey,
} from "./data";
import { gold, green } from "./theme";
import type {
  AppNotification,
  Service,
  Tab,
  Ticket,
  TimeFilter,
  Trip,
} from "./types";

type SavedPlace = {
  icon: string;
  label: string;
  location: string;
};

type NotificationSettings = {
  bookingUpdates: boolean;
  departureReminders: boolean;
  seatHoldReminders: boolean;
};

type EmergencyContact = {
  name: string;
  phone: string;
};

type ProfilePanel =
  | "language"
  | "notifications"
  | "emergency"
  | "payment"
  | "personal"
  | "tickets"
  | null;

type RecentSearch = {
  from: string;
  service: Service;
  to: string;
};

const defaultRecentSearches: RecentSearch[] = [
  { from: "Megenagna", service: "city", to: "Mexico Square" },
  { from: "Addis Ababa", service: "long", to: "Hawassa" },
];

const defaultNotificationSettings: NotificationSettings = {
  bookingUpdates: true,
  departureReminders: true,
  seatHoldReminders: true,
};

const defaultSavedPlaces: SavedPlace[] = [
  { icon: "home-variant-outline", label: "Home", location: "Megenagna" },
  { icon: "briefcase-outline", label: "Work", location: "Bole" },
  { icon: "heart-outline", label: "Favourite", location: "Mexico Square" },
];

export default function Home() {
  const [service, setService] = useState<Service>("city");
  const [tab, setTab] = useState<Tab>("Home");
  const [signedIn, setSignedIn] = useState(false);
  const [phone, setPhone] = useState("+251");
  const [signInVisible, setSignInVisible] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [seatHold, setSeatHold] = useState<{
    token: string;
    expiresAt: string;
  } | null>(null);
  const [holdingSeat, setHoldingSeat] = useState(false);
  const [searchComplete, setSearchComplete] = useState(false);
  const [searching, setSearching] = useState(false);
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>(
    defaultRecentSearches,
  );
  const [travelDateOffset, setTravelDateOffset] = useState(0);
  const [showTravelCalendar, setShowTravelCalendar] = useState(false);
  const [passengers, setPassengers] = useState(1);
  const [paymentVisible, setPaymentVisible] = useState(false);
  const [confirmedTicket, setConfirmedTicket] = useState<Ticket | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [notificationsVisible, setNotificationsVisible] = useState(false);
  const [notificationSettings, setNotificationSettings] =
    useState<NotificationSettings>(defaultNotificationSettings);
  const [emergencyContact, setEmergencyContact] =
    useState<EmergencyContact | null>(null);
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("+251");
  const [editingContact, setEditingContact] = useState(false);
  const [profilePanel, setProfilePanel] = useState<ProfilePanel>(null);
  const [riderName, setRiderName] = useState("");
  const [draftRiderName, setDraftRiderName] = useState("");
  const [remoteTrips, setRemoteTrips] = useState<Trip[]>([]);
  const [apiStatus, setApiStatus] = useState<
    "checking" | "connected" | "local" | "offline"
  >(isApiConfigured() ? "checking" : "local");
  const [demoUserId, setDemoUserId] = useState<string | null>(null);
  const [from, setFrom] = useState("Megenagna");
  const [to, setTo] = useState("Mexico Square");
  const [locationField, setLocationField] = useState<"from" | "to" | null>(
    null,
  );
  const [detailTicket, setDetailTicket] = useState<Ticket | null>(null);
  const [trackingTicket, setTrackingTicket] = useState<Ticket | null>(null);
  const [language, setLanguage] = useState<"en" | "am">("en");
  const [savedPlaces, setSavedPlaces] = useState<SavedPlace[]>(
    defaultSavedPlaces,
  );
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("Today");
  const notifiedSeatHoldEvents = useRef(new Set<string>());
  const sampleTrips = service === "city" ? cityTrips : longTrips;
  const apiTrips = remoteTrips.filter((trip) => trip.service === service);
  const trips = apiTrips.length ? apiTrips : sampleTrips;
  const timeFilteredTrips = trips.filter((trip) => {
    if (timeFilter === "Today") return true;
    const hour = Number(trip.departure.split(":")[0]);
    if (timeFilter === "Morning") return hour < 12;
    if (timeFilter === "Afternoon") return hour >= 12 && hour < 17;
    return hour >= 17;
  });
  const visibleTrips = searchComplete
    ? timeFilteredTrips.filter((trip) => trip.from === from && trip.to === to)
    : timeFilteredTrips;
  const serviceRecentSearches = recentSearches.filter(
    (search) => search.service === service,
  );
  const nextCityTrip = service === "city" ? visibleTrips[0] : null;
  const serviceAlert = nextCityTrip
    ? nextCityTrip.seats <= 20
      ? {
          detail: `${nextCityTrip.route} is filling quickly. Choose a seat soon.`,
          icon: "alert-circle-outline",
          title: "High demand on this route",
          tone: "warning" as const,
        }
      : {
          detail: `${nextCityTrip.route} is running normally with ${nextCityTrip.seats} seats available.`,
          icon: "check-circle-outline",
          title: "Service running normally",
          tone: "success" as const,
        }
    : null;
  const locations = service === "city" ? cityStops : longStops;
  const am = language === "am";
  const homeCopy = am
    ? {
        all: "ሁሉ",
        available: "የሚገኙ ጉዞዎች",
        date: "ቀን",
        from: "ከ",
        passengers: "ተሳፋሪዎች",
        recent: "የቅርብ ፍለጋዎች",
        to: "ወደ",
        trips: "ጉዞዎች",
      }
    : {
        all: "All",
        available: "Available departures",
        date: "Date",
        from: "From",
        passengers: "Passengers",
        recent: "RECENT SEARCHES",
        to: "To",
        trips: "trips",
      };

  useEffect(() => {
    void restoreRiderData();
    void refreshTrips();
  }, []);

  useEffect(() => {
    const heldSeat = selectedSeats[0];
    if (!seatHold || !heldSeat) return;

    const expiresAt = new Date(seatHold.expiresAt).getTime();
    const remainingMs = expiresAt - Date.now();
    const holdToken = seatHold.token;
    const expiryKey = `${holdToken}:expired`;
    const warningKey = `${holdToken}:warning`;

    const expireHold = () => {
      if (notifiedSeatHoldEvents.current.has(expiryKey)) return;
      notifiedSeatHoldEvents.current.add(expiryKey);
      setSeatHold((current) =>
        current?.token === holdToken ? null : current,
      );
      setSelectedSeats([]);
      setPaymentVisible(false);
      addNotification({
        title: "Seat hold expired",
        message: `Seat ${heldSeat} was released because payment was not completed in time.`,
        tone: "warning",
      });
      if (demoUserId && isApiConfigured()) {
        void releaseDemoSeatHold({ userId: demoUserId, holdToken });
      }
    };

    if (!Number.isFinite(expiresAt) || remainingMs <= 0) {
      expireHold();
      return;
    }

    const warningTimer = setTimeout(() => {
      if (notifiedSeatHoldEvents.current.has(warningKey)) return;
      notifiedSeatHoldEvents.current.add(warningKey);
      addNotification({
        title: "Seat hold ending soon",
        message: `Seat ${heldSeat} will be released in one minute. Complete payment to keep it.`,
        tone: "warning",
      });
    }, Math.max(0, remainingMs - 60_000));
    const expiryTimer = setTimeout(expireHold, remainingMs);

    return () => {
      clearTimeout(warningTimer);
      clearTimeout(expiryTimer);
    };
  }, [demoUserId, seatHold, selectedSeats]);

  async function restoreRiderData() {
    try {
      const [storedTickets, storedRider, storedNotifications, storedPlaces, storedNotificationSettings, storedEmergencyContact, storedLanguage, storedProfile, storedRecentSearches] =
        await AsyncStorage.multiGet([
          ticketsKey,
          riderKey,
          notificationsKey,
          savedPlacesKey,
          notificationSettingsKey,
          emergencyContactKey,
          languageKey,
          riderProfileKey,
          recentSearchesKey,
        ]);
      if (storedTickets[1])
        setTickets(JSON.parse(storedTickets[1]) as Ticket[]);
      if (storedNotifications[1]) {
        const savedNotifications = JSON.parse(
          storedNotifications[1],
        ) as AppNotification[];
        if (Array.isArray(savedNotifications)) {
          setNotifications(savedNotifications);
        }
      }
      if (storedRider[1]) {
        const rider = JSON.parse(storedRider[1]) as {
          phone: string;
          userId?: string;
        };
        setPhone(rider.phone);
        setDemoUserId(rider.userId ?? null);
        setSignedIn(true);
      }
      if (storedPlaces[1]) {
        const places = JSON.parse(storedPlaces[1]) as SavedPlace[];
        if (Array.isArray(places) && places.length) setSavedPlaces(places);
      }
      if (storedNotificationSettings[1]) {
        const settings = JSON.parse(
          storedNotificationSettings[1],
        ) as NotificationSettings;
        setNotificationSettings({ ...defaultNotificationSettings, ...settings });
      }
      if (storedEmergencyContact[1]) {
        const contact = JSON.parse(
          storedEmergencyContact[1],
        ) as EmergencyContact;
        if (contact.name && contact.phone) setEmergencyContact(contact);
      }
      if (storedLanguage[1] === "en" || storedLanguage[1] === "am") {
        setLanguage(storedLanguage[1]);
      }
      if (storedProfile[1]) {
        const profile = JSON.parse(storedProfile[1]) as { name?: string };
        if (profile.name) setRiderName(profile.name);
      }
      if (storedRecentSearches[1]) {
        const searches = JSON.parse(storedRecentSearches[1]) as RecentSearch[];
        if (Array.isArray(searches) && searches.length) setRecentSearches(searches);
      }
    } catch {
      // The current session continues normally if device storage is unavailable.
    }
  }

  async function refreshTrips() {
    if (!isApiConfigured()) {
      setApiStatus("local");
      return;
    }

    setApiStatus("checking");
    try {
      setRemoteTrips(await loadTrips());
      setApiStatus("connected");
    } catch {
      setApiStatus("offline");
      // Sample trips remain available when the development API is offline.
    }
  }

  async function saveTickets(nextTickets: Ticket[]) {
    setTickets(nextTickets);
    await AsyncStorage.setItem(ticketsKey, JSON.stringify(nextTickets));
  }

  function addNotification(
    notification: Omit<AppNotification, "id" | "createdAt" | "read">,
  ) {
    const nextNotification: AppNotification = {
      ...notification,
      id: `notice-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      createdAt: new Date().toISOString(),
      read: false,
    };
    setNotifications((current) => {
      const next = [nextNotification, ...current].slice(0, 30);
      void AsyncStorage.setItem(notificationsKey, JSON.stringify(next));
      return next;
    });
  }

  function openNotifications() {
    setNotificationsVisible(true);
    setNotifications((current) => {
      if (!current.some((notification) => !notification.read)) return current;
      const next = current.map((notification) => ({
        ...notification,
        read: true,
      }));
      void AsyncStorage.setItem(notificationsKey, JSON.stringify(next));
      return next;
    });
  }

  function clearNotifications() {
    setNotifications([]);
    void AsyncStorage.removeItem(notificationsKey);
  }

  function formatHoldTime(expiresAt: string) {
    const date = new Date(expiresAt);
    if (Number.isNaN(date.getTime())) return "soon";

    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  async function signOut() {
    await AsyncStorage.removeItem(riderKey);
    setDemoUserId(null);
    setSignedIn(false);
  }

  function changeService(next: Service) {
    setService(next);
    setSearchComplete(false);
    if (next === "city") {
      setFrom("Megenagna");
      setTo("Mexico Square");
    } else {
      setFrom("Addis Ababa");
      setTo("Hawassa");
    }
  }

  function pickLocation(value: string) {
    const otherLocation = locationField === "from" ? to : from;
    if (value === otherLocation) {
      Alert.alert(
        "Choose a different stop",
        "Your starting point and destination cannot be the same.",
      );
      return;
    }
    if (locationField === "from") setFrom(value);
    if (locationField === "to") setTo(value);
    setSearchComplete(false);
    setLocationField(null);
  }

  function useSavedPlace(place: SavedPlace) {
    setTo(place.location);
    setSearchComplete(false);
    setTab("Home");
  }

  function updateNotificationSetting(
    setting: keyof NotificationSettings,
    value: boolean,
  ) {
    setNotificationSettings((current) => {
      const next = { ...current, [setting]: value };
      void AsyncStorage.setItem(notificationSettingsKey, JSON.stringify(next));
      return next;
    });
  }

  function changeLanguage(nextLanguage: "en" | "am") {
    setLanguage(nextLanguage);
    void AsyncStorage.setItem(languageKey, nextLanguage);
    setProfilePanel(null);
  }

  function openPersonalDetails() {
    setDraftRiderName(riderName);
    setProfilePanel("personal");
  }

  function savePersonalDetails() {
    const name = draftRiderName.trim();
    if (!name) {
      Alert.alert("Name needed", "Enter the name you want to show on AddisGo.");
      return;
    }
    setRiderName(name);
    void AsyncStorage.setItem(riderProfileKey, JSON.stringify({ name }));
    setProfilePanel(null);
  }

  function openContactEditor() {
    setContactName(emergencyContact?.name ?? "");
    setContactPhone(emergencyContact?.phone ?? "+251");
    setEditingContact(true);
  }

  function saveEmergencyContact() {
    const name = contactName.trim();
    const phoneNumber = contactPhone.trim();
    if (!name || phoneNumber.length < 8) {
      Alert.alert("Contact details needed", "Enter a name and valid phone number.");
      return;
    }
    const next = { name, phone: phoneNumber };
    setEmergencyContact(next);
    void AsyncStorage.setItem(emergencyContactKey, JSON.stringify(next));
    setEditingContact(false);
  }
  function searchBuses() {
    setSearching(true);
    setSearchComplete(false);
    setTimeout(() => {
      const currentSearch = { from, service, to };
      setRecentSearches((current) => {
        const next = [
          currentSearch,
          ...current.filter(
            (search) =>
              search.from !== currentSearch.from ||
              search.to !== currentSearch.to ||
              search.service !== currentSearch.service,
          ),
        ].slice(0, 4);
        void AsyncStorage.setItem(recentSearchesKey, JSON.stringify(next));
        return next;
      });
      setSearching(false);
      setSearchComplete(true);
    }, 550);
  }

  function swapLocations() {
    setFrom(to);
    setTo(from);
    setSearchComplete(false);
  }

  function applyRecentSearch(search: RecentSearch) {
    setService(search.service);
    setFrom(search.from);
    setTo(search.to);
    setSearchComplete(false);
  }

  function travelDateLabel(offset = travelDateOffset) {
    const date = new Date();
    date.setDate(date.getDate() + offset);
    return date.toLocaleDateString(language === "am" ? "am-ET" : "en-ET", {
      day: "numeric",
      month: "short",
      weekday: "short",
    });
  }

  function hasDeparturePassed(trip: Trip) {
    if ((trip.service ?? service) !== "long" || travelDateOffset !== 0) {
      return false;
    }
    const [hour, minute] = trip.departure.split(":").map(Number);
    if (!Number.isFinite(hour) || !Number.isFinite(minute)) return false;
    const departure = new Date();
    departure.setHours(hour, minute, 0, 0);
    return departure.getTime() <= Date.now();
  }

  function bookingTotalFare(trip: Trip) {
    const unitFare = Number(trip.fare.replace(/\D/g, ""));
    if (!Number.isFinite(unitFare)) return trip.fare;
    return `ETB ${(unitFare * passengers).toLocaleString()}`;
  }

  function chooseTrip(trip: Trip) {
    void clearSeatHold();
    setSelectedTrip(trip);
    setSelectedSeats([]);
    if (!signedIn) setSignInVisible(true);
    else setTab("Bookings");
  }

  async function clearSeatHold() {
    const currentHold = seatHold;
    setSeatHold(null);
    if (currentHold && demoUserId && isApiConfigured()) {
      await releaseDemoSeatHold({
        userId: demoUserId,
        holdToken: currentHold.token,
      });
    }
  }

  async function selectSeat(seat: string) {
    if (!selectedTrip || holdingSeat) return;
    if (hasDeparturePassed(selectedTrip)) {
      Alert.alert(
        "Departure time passed",
        "Choose Tomorrow in Journey details before selecting a seat.",
      );
      return;
    }
    if (selectedSeats.includes(seat)) {
      if (seat === selectedSeats[0]) await clearSeatHold();
      setSelectedSeats((current) => current.filter((item) => item !== seat));
      return;
    }
    if (selectedSeats.length >= passengers) {
      Alert.alert(
        "Seat limit reached",
        `You selected ${passengers} passenger${passengers === 1 ? "" : "s"}. Deselect a seat to choose another.`,
      );
      return;
    }
    const isFirstSeat = selectedSeats.length === 0;
    setSelectedSeats((current) => [...current, seat]);
    const isRemoteTrip = remoteTrips.some(
      (trip) => trip.id === selectedTrip.id,
    );
    if (!isFirstSeat || !demoUserId || !isRemoteTrip || !isApiConfigured()) return;

    setHoldingSeat(true);
    try {
      const hold = await createDemoSeatHold({
        userId: demoUserId,
        tripId: selectedTrip.id,
        seatNumber: seat,
      });
      setSeatHold({ token: hold.hold_token, expiresAt: hold.expires_at });
      addNotification({
        title: "Seat held",
        message: `Seat ${seat} is reserved until ${formatHoldTime(hold.expires_at)}. Complete payment to keep it.`,
        tone: "info",
      });
    } catch (error) {
      setSelectedSeats([]);
      Alert.alert(
        "Seat unavailable",
        error instanceof Error ? error.message : "Please choose another seat.",
      );
    } finally {
      setHoldingSeat(false);
    }
  }
  async function signIn() {
    if (!/^\+251\d{9}$/.test(phone)) {
      Alert.alert("Enter a valid number", "Example: +251913655539");
      return;
    }
    let userId = `local-${phone.replace(/\D/g, "")}`;
    if (isApiConfigured()) {
      try {
        userId = (await createDemoSession(phone)).user_id;
      } catch {
        Alert.alert(
          "Offline sign-in",
          "Your rider account is saved on this device. The API will sync when it is available.",
        );
      }
    }
    setDemoUserId(userId);
    await AsyncStorage.setItem(riderKey, JSON.stringify({ phone, userId }));
    setSignedIn(true);
    setSignInVisible(false);
    setTab("Bookings");
  }
  function pay() {
    if (selectedTrip && hasDeparturePassed(selectedTrip)) {
      Alert.alert(
        "Departure time passed",
        "Choose Tomorrow in Journey details before continuing to payment.",
      );
      return;
    }
    if (selectedSeats.length !== passengers) {
      Alert.alert(
        "Choose seats",
        `Please select ${passengers} seat${passengers === 1 ? "" : "s"} before continuing.`,
      );
      return;
    }
    const isRemoteTrip = remoteTrips.some(
      (trip) => trip.id === selectedTrip?.id,
    );
    if (isRemoteTrip && demoUserId && isApiConfigured() && !seatHold) {
      Alert.alert(
        "Seat is not held",
        "Please select the seat again before continuing to payment.",
      );
      return;
    }
    setPaymentVisible(true);
  }
  async function confirmPayment() {
    if (!selectedTrip || !selectedSeats.length) return;
    let reference = `AG-${Date.now().toString().slice(-6)}`;
    const isRemoteTrip = remoteTrips.some(
      (trip) => trip.id === selectedTrip.id,
    );
    if (demoUserId && isRemoteTrip && isApiConfigured()) {
      try {
        reference = (
          await createDemoBooking({
            userId: demoUserId,
            tripId: selectedTrip.id,
            seatNumber: selectedSeats[0],
            phone,
            holdToken: seatHold?.token,
          })
        ).reference;
      } catch (error) {
        Alert.alert(
          "Booking not confirmed",
          error instanceof Error
            ? error.message
            : "Please choose your seat again and retry.",
        );
        setPaymentVisible(false);
        setSeatHold(null);
        setSelectedSeats([]);
        return;
      }
    }
    const ticket: Ticket = {
      ...selectedTrip,
      seat: selectedSeats.join(", "),
      reference,
      paidAt: new Date().toLocaleDateString(),
    };
    await saveTickets([ticket, ...tickets]);
    addNotification({
      title: "Booking confirmed",
      message: `${ticket.route} · Seat ${ticket.seat}. Your travel pass is ready.`,
      tone: "success",
    });
    setSeatHold(null);
    setPaymentVisible(false);
    setSelectedSeats([]);
    setSelectedTrip(null);
    setConfirmedTicket(ticket);
  }

  function renderHome() {
    return (
      <>
        <ImageBackground
          source={require("../assets/addis-hero.png")}
          style={styles.hero}
          imageStyle={styles.heroImage}
        >
          <LinearGradient
            colors={[
              "rgba(0,76,56,0.94)",
              "rgba(0,93,68,0.60)",
              "rgba(0,55,39,0.08)",
            ]}
            style={styles.heroOverlay}
          >
            <View style={styles.topRow}>
              <View>
                <View style={styles.brandRow}>
                  <MaterialCommunityIcons name="bus" color={gold} size={31} />
                  <Text style={styles.brand}>
                    Addis<Text style={styles.brandLight}>Go</Text>
                  </Text>
                </View>
                <Text style={styles.brandTagline}>
                  Travel Smart. Move Together.
                </Text>
              </View>
              <View style={styles.topActions}>
                <Pressable
                  onPress={() => changeLanguage(am ? "en" : "am")}
                  style={styles.languageButton}
                >
                  <Text style={styles.languageText}>{am ? "EN" : "አማ"}</Text>
                </Pressable>
                <Pressable
                  accessibilityLabel="Open notifications"
                  onPress={openNotifications}
                  style={styles.accountButton}
                >
                  <MaterialCommunityIcons
                    name="bell-outline"
                    color={green}
                    size={22}
                  />
                  {notifications.some((notification) => !notification.read) && (
                    <View style={styles.notificationDot} />
                  )}
                </Pressable>
              </View>
            </View>
            <Text style={styles.eyebrow}>
              {am ? "የኢትዮጵያ የአውቶቡስ ጉዞ ጓደኛ" : "ETHIOPIA’S BUS TRAVEL COMPANION"}
            </Text>
            <Text style={styles.heroTitle}>
              {service === "city" ? (
                am ? (
                  "በአዲስ አበባ ይጓዙ"
                ) : (
                  <>
                    Move around{"\n"}
                    <Text style={styles.heroGold}>Addis</Text>
                  </>
                )
              ) : am ? (
                "በኢትዮጵያ ይጓዙ"
              ) : (
                "Travel across Ethiopia"
              )}
            </Text>
            <Text style={styles.heroSubtitle}>
              {am
                ? "ቀላል፣ ፈጣን እና አስተማማኝ የአውቶቡስ ጉዞ።"
                : service === "city"
                  ? "Fast, clear city routes for everyday movement."
                  : "Find comfortable travel to Ethiopia’s cities."}
            </Text>
          </LinearGradient>
        </ImageBackground>

        <View style={styles.searchCard}>
          <View style={styles.serviceSwitch}>
            <SwitchButton
              active={service === "city"}
              label={am ? "የከተማ አውቶቡስ" : "City bus"}
              onPress={() => changeService("city")}
            />
            <SwitchButton
              active={service === "long"}
              label={am ? "ረጅም ርቀት" : "Long distance"}
              onPress={() => changeService("long")}
            />
          </View>
          <View style={styles.inlineRoutePicker}>
            <Pressable
              onPress={() => setLocationField("from")}
              style={styles.inlineRouteSide}
            >
              <MaterialCommunityIcons name="map-marker" color={green} size={20} />
              <View style={styles.inlineRouteCopy}>
                <Text style={styles.inlineRouteLabel}>{homeCopy.from}</Text>
                <Text numberOfLines={1} style={styles.inlineRouteValue}>{from}</Text>
              </View>
            </Pressable>
            <Pressable
              accessibilityLabel="Swap departure and destination"
              onPress={swapLocations}
              style={styles.inlineRouteSwap}
            >
              <MaterialCommunityIcons name="swap-horizontal" color="white" size={18} />
            </Pressable>
            <Pressable
              onPress={() => setLocationField("to")}
              style={styles.inlineRouteSide}
            >
              <MaterialCommunityIcons name="flag-variant" color={green} size={20} />
              <View style={styles.inlineRouteCopy}>
                <Text style={styles.inlineRouteLabel}>{homeCopy.to}</Text>
                <Text numberOfLines={1} style={styles.inlineRouteValue}>{to}</Text>
              </View>
            </Pressable>
          </View>
          <View style={styles.recentSearches}>
            <Text style={styles.recentSearchesLabel}>{homeCopy.recent}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.recentSearchRow}>
                {serviceRecentSearches.map((search) => (
                  <Pressable
                    key={`${search.service}-${search.from}-${search.to}`}
                    onPress={() => applyRecentSearch(search)}
                    style={styles.recentSearchChip}
                  >
                    <MaterialCommunityIcons
                      name={search.service === "city" ? "bus" : "road-variant"}
                      color={green}
                      size={14}
                    />
                    <Text style={styles.recentSearchText}>
                      {search.from} → {search.to}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          </View>
          <Pressable
            disabled={searching}
            onPress={searchBuses}
            style={[
              styles.searchButton,
              searching && styles.searchButtonLoading,
            ]}
          >
            {searching ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.searchButtonText}>
                {am ? "⌕  አውቶቡሶችን ፈልግ" : "⌕  Search buses"}
              </Text>
            )}
          </Pressable>
          {searchComplete && (
            <>
              <Text style={styles.searchResult}>
                {visibleTrips.length
                  ? am
                    ? `${visibleTrips.length} ተዛማጅ ጉዞዎች ተገኝተዋል። ለመቀጠል መቀመጫ ይምረጡ።`
                    : `${visibleTrips.length} matching ${visibleTrips.length === 1 ? "trip" : "trips"} found. Select a seat to continue.`
                  : am
                    ? "ተዛማጅ ጉዞ አልተገኘም።"
                    : "No matching departures found."}
              </Text>
              {!visibleTrips.length && (
                <View style={styles.noResultsCard}>
                  <View style={styles.noResultsIcon}>
                    <MaterialCommunityIcons name="map-search-outline" color={green} size={25} />
                  </View>
                  <View style={styles.noResultsCopy}>
                    <Text style={styles.noResultsTitle}>
                      {am ? "አማራጭ ጉዞ ይሞክሩ" : "Try another journey"}
                    </Text>
                    <Text style={styles.noResultsDetail}>
                      {am
                        ? "በዚህ ጊዜ ለተመረጠው መስመር ጉዞ የለም።"
                        : "There is no scheduled bus for this route at this time."}
                    </Text>
                  </View>
                  <View style={styles.noResultsSuggestions}>
                    {defaultRecentSearches
                      .filter((search) => search.service === service)
                      .map((suggestion) => (
                        <Pressable
                          key={`${suggestion.from}-${suggestion.to}`}
                          onPress={() => applyRecentSearch(suggestion)}
                          style={styles.noResultsSuggestion}
                        >
                          <Text style={styles.noResultsSuggestionText}>
                            {suggestion.from} → {suggestion.to}
                          </Text>
                        </Pressable>
                      ))}
                  </View>
                  <View style={styles.noResultsActions}>
                    <Pressable
                      onPress={() => setSearchComplete(false)}
                      style={styles.noResultsSecondaryAction}
                    >
                      <Text style={styles.noResultsSecondaryText}>
                        {am ? "ሁሉንም አሳይ" : "Show all buses"}
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => changeService(service === "city" ? "long" : "city")}
                      style={styles.noResultsPrimaryAction}
                    >
                      <Text style={styles.noResultsPrimaryText}>
                        {service === "city"
                          ? am ? "ረጅም ርቀት" : "Long distance"
                          : am ? "የከተማ አውቶቡስ" : "City bus"}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              )}
            </>
          )}
        </View>
        <RoutePreview from={from} to={to} isLongDistance={service === "long"} />
        {nextCityTrip && (
          <Pressable
            onPress={() => chooseTrip(nextCityTrip)}
            style={styles.liveArrivalCard}
          >
            <View style={styles.liveArrivalTop}>
              <View style={styles.liveArrivalBadge}>
                <MaterialCommunityIcons name="bus-clock" color="#CFFFDC" size={19} />
                <Text style={styles.liveArrivalBadgeText}>LIVE ARRIVAL</Text>
              </View>
              <View style={styles.liveArrivalEta}>
                <Text style={styles.liveArrivalMinutes}>3 min</Text>
                <Text style={styles.liveArrivalEtaLabel}>away</Text>
              </View>
            </View>
            <View style={styles.liveArrivalBody}>
              <View style={styles.liveArrivalBus}>
                <MaterialCommunityIcons name="bus" color={green} size={27} />
              </View>
              <View style={styles.liveArrivalCopy}>
                <Text style={styles.liveArrivalRoute}>{nextCityTrip.route}</Text>
                <Text style={styles.liveArrivalDetail}>
                  {nextCityTrip.from} → {nextCityTrip.to} · {nextCityTrip.seats} seats left
                </Text>
              </View>
              <View style={styles.liveArrivalAction}>
                <Text style={styles.liveArrivalActionText}>Choose seat</Text>
                <MaterialCommunityIcons name="arrow-right" color="white" size={16} />
              </View>
            </View>
          </Pressable>
        )}
        {serviceAlert && (
          <View
            style={[
              styles.serviceAlertCard,
              serviceAlert.tone === "warning"
                ? styles.serviceAlertWarning
                : styles.serviceAlertSuccess,
            ]}
          >
            <MaterialCommunityIcons
              name={serviceAlert.icon as never}
              color={serviceAlert.tone === "warning" ? "#A56A00" : green}
              size={23}
            />
            <View style={styles.serviceAlertCopy}>
              <Text style={styles.serviceAlertTitle}>{serviceAlert.title}</Text>
              <Text style={styles.serviceAlertDetail}>{serviceAlert.detail}</Text>
            </View>
          </View>
        )}
        {service === "city" && (
          <QuickAccess
            onSchedules={() => setSearchComplete(true)}
            onTrips={() => setTab("My Trips")}
            onSupport={() => setTab("Support")}
          />
        )}

        {service === "long" && (
          <View style={styles.popularSection}>
            <Text style={styles.sectionTitle}>Popular destinations</Text>
            <View style={styles.destinationRow}>
              <Destination name="Hawassa" />
              <Destination name="Bahir Dar" />
              <Destination name="Dire Dawa" />
            </View>
          </View>
        )}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{homeCopy.available}</Text>
          <Text style={styles.viewAll}>{visibleTrips.length} {homeCopy.trips}</Text>
        </View>
        <View style={styles.filterRow}>
          {(["Today", "Morning", "Afternoon", "Evening"] as TimeFilter[]).map(
            (filter) => (
              <Pressable
                key={filter}
                onPress={() => setTimeFilter(filter)}
                style={[
                  styles.filterChip,
                  timeFilter === filter && styles.filterChipActive,
                ]}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    timeFilter === filter && styles.filterChipTextActive,
                  ]}
                >
                  {filter}
                </Text>
              </Pressable>
            ),
          )}
        </View>
        {visibleTrips.map((trip) => (
          <TripCard
            key={trip.id}
            trip={trip}
            onPress={() => chooseTrip(trip)}
          />
        ))}
        {!visibleTrips.length && (
          <Text style={styles.noTrips}>
            {searchComplete
              ? "No departures match this route and time. Try another route or filter."
              : "No departures in this time range. Try another filter."}
          </Text>
        )}
      </>
    );
  }

  function renderBooking() {
    if (!selectedTrip)
      return (
        <EmptyState
          title="Choose your journey"
          detail="Search routes from Home, then select your bus and seat."
          action="Browse buses"
          onPress={() => setTab("Home")}
        />
      );
    const departurePassed = hasDeparturePassed(selectedTrip);
    const bookingDates = Array.from({ length: 7 }, (_, offset) => {
      const date = new Date();
      date.setDate(date.getDate() + offset);
      return {
        day: date.toLocaleDateString(language === "am" ? "am-ET" : "en-ET", { day: "numeric" }),
        label: offset === 0 ? (am ? "ዛሬ" : "Today") : offset === 1 ? (am ? "ነገ" : "Tomorrow") : date.toLocaleDateString(language === "am" ? "am-ET" : "en-ET", { weekday: "short" }),
        offset,
      };
    });
    return (
      <View style={styles.screenPadding}>
        <Text style={styles.screenTitle}>Choose your seat</Text>
        <Text style={styles.screenText}>
          {selectedTrip.route} · {selectedTrip.departure}
        </Text>
        <View style={styles.progressRow}>
          <ProgressStep label="Review" active />
          <ProgressLine />
          <ProgressStep label="Seat" active />
          <ProgressLine />
          <ProgressStep label="Pay" />
          <ProgressLine />
          <ProgressStep label="Ticket" />
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryOperator}>{selectedTrip.operator}</Text>
          <View style={styles.summaryFareGroup}>
            <Text style={styles.summaryFare}>{bookingTotalFare(selectedTrip)}</Text>
            <Text style={styles.summaryFareNote}>
              {passengers} × {selectedTrip.fare}
            </Text>
          </View>
        </View>
        {(selectedTrip.service ?? service) === "long" && (
          <View style={styles.bookingPlannerCard}>
            <Text style={styles.bookingPlannerTitle}>Journey details</Text>
            <View style={styles.longPlannerRow}>
              <Pressable
                onPress={() => setShowTravelCalendar((visible) => !visible)}
                style={styles.longPlannerDate}
              >
                <MaterialCommunityIcons name="calendar-month" color={green} size={19} />
                <View>
                  <Text style={styles.longPlannerLabel}>{homeCopy.date}</Text>
                  <Text style={styles.longPlannerValue}>
                    {travelDateOffset === 0
                      ? `${am ? "ዛሬ" : "Today"} · ${travelDateLabel()}`
                      : travelDateOffset === 1
                        ? `${am ? "ነገ" : "Tomorrow"} · ${travelDateLabel()}`
                        : travelDateLabel()}
                  </Text>
                </View>
                <MaterialCommunityIcons name="chevron-down" color="#667D72" size={18} />
              </Pressable>
              <View style={styles.longPlannerPassengers}>
                <Text style={styles.longPlannerLabel}>{homeCopy.passengers}</Text>
                <View style={styles.passengerControl}>
                  <Pressable
                    disabled={passengers === 1}
                    onPress={() => setPassengers((count) => Math.max(1, count - 1))}
                    style={[styles.passengerButton, passengers === 1 && styles.passengerButtonDisabled]}
                  >
                    <MaterialCommunityIcons name="minus" color={green} size={16} />
                  </Pressable>
                  <Text style={styles.passengerCount}>{passengers}</Text>
                  <Pressable
                    disabled={passengers === 6}
                    onPress={() => setPassengers((count) => Math.min(6, count + 1))}
                    style={[styles.passengerButton, passengers === 6 && styles.passengerButtonDisabled]}
                  >
                    <MaterialCommunityIcons name="plus" color={green} size={16} />
                  </Pressable>
                </View>
              </View>
            </View>
            {showTravelCalendar && (
              <View style={styles.travelCalendar}>
                {bookingDates.map((date) => (
                  <Pressable
                    key={date.offset}
                    onPress={() => {
                      setTravelDateOffset(date.offset);
                      setShowTravelCalendar(false);
                    }}
                    style={[
                      styles.travelCalendarDate,
                      travelDateOffset === date.offset && styles.travelCalendarDateActive,
                    ]}
                  >
                    <Text style={[styles.travelCalendarLabel, travelDateOffset === date.offset && styles.travelCalendarLabelActive]}>
                      {date.label}
                    </Text>
                    <Text style={[styles.travelCalendarDay, travelDateOffset === date.offset && styles.travelCalendarDayActive]}>
                      {date.day}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
            {departurePassed && (
              <View style={styles.departurePassedNotice}>
                <MaterialCommunityIcons name="clock-alert-outline" color="#9A6100" size={17} />
                <Text style={styles.departurePassedText}>
                  This departure has passed for today. Choose Tomorrow to book.
                </Text>
              </View>
            )}
          </View>
        )}
        <View style={styles.busLayout}>
          <View style={styles.busHeader}>
            <Text style={styles.busHeaderText}>DRIVER</Text>
            <Text style={styles.busHeaderText}>Front of bus</Text>
          </View>
          <View style={styles.legend}>
            <Legend color={green} label="Selected" />
            <Legend color="#FFFFFF" label="Available" />
            <Legend color="#D6DED9" label="Taken" />
          </View>
          <View style={styles.seatGrid}>
            {seats.map((seat, index) => (
              <Pressable
                key={seat}
                disabled={occupiedSeats.has(seat) || holdingSeat || departurePassed}
                onPress={() => void selectSeat(seat)}
                style={[
                  styles.seat,
                  index % 4 === 2 && styles.aisleSpace,
                  occupiedSeats.has(seat) && styles.seatTaken,
                  departurePassed && styles.seatTimeUnavailable,
                  selectedSeats.includes(seat) && styles.seatSelected,
                ]}
              >
                <Text
                  style={[
                    styles.seatText,
                    occupiedSeats.has(seat) && styles.seatTextTaken,
                    selectedSeats.includes(seat) && styles.seatTextSelected,
                  ]}
                >
                  {seat}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
        {!!selectedSeats.length && (
          <Text style={styles.seatHoldText}>
            {holdingSeat
              ? `Holding seat ${selectedSeats[0]}…`
              : seatHold
                ? `Seat ${selectedSeats[0]} is held until ${new Date(seatHold.expiresAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}.`
                : `${selectedSeats.length} of ${passengers} seats selected.`}
          </Text>
        )}
        <Pressable
          disabled={departurePassed}
          onPress={pay}
          style={[styles.continueButton, departurePassed && styles.continueButtonDisabled]}
        >
          <Text style={styles.continueButtonText}>
            {selectedSeats.length === passengers
              ? `Continue with ${selectedSeats.length} seat${selectedSeats.length === 1 ? "" : "s"}`
              : `Select ${passengers - selectedSeats.length} more seat${passengers - selectedSeats.length === 1 ? "" : "s"}`}
          </Text>
        </Pressable>
      </View>
    );
  }

  function renderTrips() {
    if (!tickets.length)
      return <TripsEmptyState onPress={() => setTab("Home")} />;
    const [upcomingTicket, ...pastTickets] = tickets;
    return (
      <View style={styles.screenPadding}>
        <Text style={styles.screenTitle}>My trips</Text>
        <Text style={styles.screenText}>
          Your next journey, travel pass, and saved receipts.
        </Text>
        <Text style={styles.tripsSectionLabel}>UPCOMING JOURNEY</Text>
        <UpcomingTripCard
          ticket={upcomingTicket}
          onOpenTicket={() => setDetailTicket(upcomingTicket)}
          onTrackBus={() => setTrackingTicket(upcomingTicket)}
        />
        {pastTickets.length > 0 && (
          <Text style={styles.tripsSectionLabel}>SAVED RECEIPTS</Text>
        )}
        {pastTickets.map((ticket) => (
          <ReceiptCard
            key={ticket.reference}
            ticket={ticket}
            onPress={() => setDetailTicket(ticket)}
          />
        ))}
      </View>
    );
  }

  function renderProfile() {
    const profileItems = [
      {
        detail: riderName || "Your phone number and rider details",
        icon: "account-edit-outline",
        label: "Personal details",
        onPress: openPersonalDetails,
      },
      {
        detail: tickets.length
          ? `${tickets.length} ticket${tickets.length === 1 ? "" : "s"} saved on this phone`
          : "Your upcoming and completed journeys",
        icon: "ticket-confirmation-outline",
        label: "My tickets",
        onPress: () => setProfilePanel("tickets"),
      },
      {
        detail: language === "en" ? "English" : "አማርኛ",
        icon: "translate",
        label: "Language",
        onPress: () => setProfilePanel("language"),
      },
      {
        detail: "Booking and departure alerts",
        icon: "bell-outline",
        label: "Notifications",
        onPress: () => setProfilePanel("notifications"),
      },
      {
        detail: emergencyContact
          ? `${emergencyContact.name} · ${emergencyContact.phone}`
          : "Add someone for long-distance travel",
        icon: "shield-account-outline",
        label: "Emergency contact",
        onPress: () => setProfilePanel("emergency"),
      },
      {
        detail: "Telebirr demo · Ready for merchant setup",
        icon: "wallet-outline",
        label: "Payment methods",
        onPress: () => setProfilePanel("payment"),
      },
    ];
    return (
      <View style={styles.screenPadding}>
        <Text style={styles.profileHeading}>My profile</Text>
        <Text style={styles.profileIntro}>
          Manage your rider account and travel preferences.
        </Text>
        <LinearGradient
          colors={["#075D46", "#11835D", "#0BA16C"]}
          end={{ x: 1, y: 1 }}
          start={{ x: 0, y: 0 }}
          style={styles.profileCard}
        >
          <View style={styles.profileAvatar}>
            <MaterialCommunityIcons name="account" color={green} size={34} />
          </View>
          <View style={styles.profileCopy}>
            <Text style={styles.profileName}>
              {riderName || (signedIn ? "AddisGo rider" : "Guest rider")}
            </Text>
            <Text style={styles.profilePhone}>
              {signedIn ? phone : "Sign in to save your journeys"}
            </Text>
          </View>
          {signedIn && (
            <View style={styles.verifiedPill}>
              <MaterialCommunityIcons name="check-decagram" color="#D5FFE2" size={15} />
              <Text style={styles.verifiedText}>Verified</Text>
            </View>
          )}
        </LinearGradient>

        <View style={styles.profileMenu}>
          {profileItems.map((item) => (
            <View key={item.label}>
            <Pressable
              onPress={
                item.onPress ??
                (() =>
                  Alert.alert(
                    item.label,
                    "This profile setting will be added in the next step.",
                  ))
              }
              style={styles.profileMenuItem}
            >
              <View style={styles.profileMenuIcon}>
                <MaterialCommunityIcons
                  name={item.icon as never}
                  color={green}
                  size={22}
                />
              </View>
              <View style={styles.profileMenuCopy}>
                <Text style={styles.profileMenuTitle}>{item.label}</Text>
                <Text style={styles.profileMenuDetail}>{item.detail}</Text>
              </View>
              <MaterialCommunityIcons
                name="chevron-right"
                color="#91A39A"
                size={24}
              />
            </Pressable>
            {item.label === "Notifications" && profilePanel === "notifications" && (
              <View style={styles.profileInlinePanel}>
                {[
                  ["bookingUpdates", "Booking updates", "Confirmation and ticket changes"],
                  ["departureReminders", "Departure reminders", "Alerts before your bus leaves"],
                  ["seatHoldReminders", "Seat-hold reminders", "Warnings before a selected seat expires"],
                ].map(([setting, title, detail], index) => (
                  <View
                    key={setting}
                    style={[
                      styles.notificationSettingRow,
                      index === 2 && styles.notificationSettingLast,
                    ]}
                  >
                    <View style={styles.notificationSettingCopy}>
                      <Text style={styles.notificationSettingTitle}>{title}</Text>
                      <Text style={styles.notificationSettingDetail}>{detail}</Text>
                    </View>
                    <Switch
                      onValueChange={(value) =>
                        updateNotificationSetting(
                          setting as keyof NotificationSettings,
                          value,
                        )
                      }
                      thumbColor="white"
                      trackColor={{ false: "#C7D4CD", true: green }}
                      value={notificationSettings[setting as keyof NotificationSettings]}
                    />
                  </View>
                ))}
              </View>
            )}
            {item.label === "My tickets" && profilePanel === "tickets" && (
              <View style={styles.profileInlinePanel}>
                {tickets.length ? (
                  tickets.slice(0, 2).map((ticket) => (
                    <Pressable
                      key={ticket.reference}
                      onPress={() => setDetailTicket(ticket)}
                      style={styles.inlineTicket}
                    >
                      <View style={styles.inlineTicketIcon}>
                        <MaterialCommunityIcons name="ticket-confirmation-outline" color={green} size={22} />
                      </View>
                      <View style={styles.inlineTicketCopy}>
                        <Text numberOfLines={1} style={styles.inlineTicketRoute}>{ticket.route}</Text>
                        <Text style={styles.inlineTicketDetail}>
                          Seat {ticket.seat} · {ticket.departure}
                        </Text>
                      </View>
                      <MaterialCommunityIcons name="chevron-right" color="#7C9085" size={22} />
                    </Pressable>
                  ))
                ) : (
                  <View style={styles.inlineEmptyTicket}>
                    <MaterialCommunityIcons name="ticket-outline" color={green} size={22} />
                    <Text style={styles.inlineEmptyTicketText}>No tickets yet. Book a bus to see your receipt here.</Text>
                    <Pressable onPress={() => setTab("Home")} style={styles.inlineTicketAction}>
                      <Text style={styles.inlineTicketActionText}>Find a bus</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            )}
            {item.label === "Language" && profilePanel === "language" && (
              <View style={styles.profileInlinePanel}>
                <Text style={styles.profilePanelTitle}>Choose your language</Text>
                <View style={styles.languageOptions}>
                  <Pressable
                    onPress={() => changeLanguage("en")}
                    style={[styles.languageOption, language === "en" && styles.languageOptionActive]}
                  >
                    <Text style={[styles.languageOptionText, language === "en" && styles.languageOptionTextActive]}>English</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => changeLanguage("am")}
                    style={[styles.languageOption, language === "am" && styles.languageOptionActive]}
                  >
                    <Text style={[styles.languageOptionText, language === "am" && styles.languageOptionTextActive]}>አማርኛ</Text>
                  </Pressable>
                </View>
              </View>
            )}
            {item.label === "Personal details" && profilePanel === "personal" && (
              <View style={styles.profileInlinePanel}>
                <Text style={styles.profilePanelTitle}>Personal details</Text>
                <Text style={styles.profilePanelHint}>
                  Your phone number stays verified through sign-in.
                </Text>
                <TextInput
                  onChangeText={setDraftRiderName}
                  placeholder="Your display name"
                  style={styles.profileDetailsInput}
                  value={draftRiderName}
                />
                <Pressable onPress={savePersonalDetails} style={styles.profileDetailsSave}>
                  <Text style={styles.profileDetailsSaveText}>Save details</Text>
                </Pressable>
              </View>
            )}
            {item.label === "Emergency contact" && profilePanel === "emergency" && (
              <View style={styles.profileInlinePanel}>
                {editingContact ? (
                  <View style={styles.emergencyEditor}>
                    <Text style={styles.emergencyEditorLabel}>Trusted contact name</Text>
                    <TextInput
                      onChangeText={setContactName}
                      placeholder="Full name"
                      style={styles.emergencyInput}
                      value={contactName}
                    />
                    <Text style={styles.emergencyEditorLabel}>Phone number</Text>
                    <TextInput
                      keyboardType="phone-pad"
                      onChangeText={setContactPhone}
                      placeholder="+251..."
                      style={styles.emergencyInput}
                      value={contactPhone}
                    />
                    <View style={styles.emergencyEditorActions}>
                      <Pressable onPress={() => setEditingContact(false)} style={styles.emergencyCancel}>
                        <Text style={styles.emergencyCancelText}>Cancel</Text>
                      </Pressable>
                      <Pressable onPress={saveEmergencyContact} style={styles.emergencySave}>
                        <Text style={styles.emergencySaveText}>Save contact</Text>
                      </Pressable>
                    </View>
                  </View>
                ) : emergencyContact ? (
                  <Pressable onPress={openContactEditor} style={styles.emergencyContactCard}>
                    <View style={styles.emergencyContactIcon}>
                      <MaterialCommunityIcons name="account-heart-outline" color={green} size={24} />
                    </View>
                    <View style={styles.emergencyContactCopy}>
                      <Text style={styles.emergencyContactName}>{emergencyContact.name}</Text>
                      <Text style={styles.emergencyContactPhone}>{emergencyContact.phone}</Text>
                    </View>
                    <MaterialCommunityIcons name="pencil-outline" color="#7C9085" size={20} />
                  </Pressable>
                ) : (
                  <Pressable onPress={openContactEditor} style={styles.emergencyEmptyCard}>
                    <View style={styles.emergencyContactIcon}>
                      <MaterialCommunityIcons name="plus" color={green} size={25} />
                    </View>
                    <View style={styles.emergencyContactCopy}>
                      <Text style={styles.emergencyContactName}>Add an emergency contact</Text>
                      <Text style={styles.emergencyContactPhone}>Choose someone we can notify if needed.</Text>
                    </View>
                    <MaterialCommunityIcons name="chevron-right" color="#7C9085" size={23} />
                  </Pressable>
                )}
              </View>
            )}
            {item.label === "Payment methods" && profilePanel === "payment" && (
              <View style={styles.profileInlinePanel}>
                <Pressable
                  onPress={() =>
                    Alert.alert(
                      "Telebirr demo",
                      "Demo payment is enabled. Your real Telebirr merchant connection can be added later without changing this screen.",
                    )
                  }
                  style={styles.paymentMethodCard}
                >
                  <View style={styles.profileTelebirrMark}>
                    <Text style={styles.profileTelebirrMarkText}>tele</Text>
                  </View>
                  <View style={styles.paymentMethodCopy}>
                    <Text style={styles.paymentMethodTitle}>Telebirr</Text>
                    <Text style={styles.paymentMethodDetail}>
                      Demo checkout · Ready for merchant setup
                    </Text>
                  </View>
                  <View style={styles.paymentReadyPill}>
                    <MaterialCommunityIcons name="check-circle" color="#0A9257" size={14} />
                    <Text style={styles.paymentReadyText}>Demo</Text>
                  </View>
                </Pressable>
                <View style={styles.paymentHint}>
                  <MaterialCommunityIcons name="lock-outline" color="#71857B" size={15} />
                  <Text style={styles.paymentHintText}>
                    AddisGo never stores your payment PIN.
                  </Text>
                </View>
              </View>
            )}
            </View>
          ))}
        </View>
        {false && profilePanel === "language" && (
          <View style={styles.profilePanelCard}>
            <Text style={styles.profilePanelTitle}>Choose your language</Text>
            <View style={styles.languageOptions}>
              <Pressable
                onPress={() => changeLanguage("en")}
                style={[
                  styles.languageOption,
                  language === "en" && styles.languageOptionActive,
                ]}
              >
                <Text style={[styles.languageOptionText, language === "en" && styles.languageOptionTextActive]}>English</Text>
              </Pressable>
              <Pressable
                onPress={() => changeLanguage("am")}
                style={[
                  styles.languageOption,
                  language === "am" && styles.languageOptionActive,
                ]}
              >
                <Text style={[styles.languageOptionText, language === "am" && styles.languageOptionTextActive]}>አማርኛ</Text>
              </Pressable>
            </View>
          </View>
        )}
        {false && profilePanel === "personal" && (
          <View style={styles.profilePanelCard}>
            <Text style={styles.profilePanelTitle}>Personal details</Text>
            <Text style={styles.profilePanelHint}>
              Your phone number stays verified through sign-in.
            </Text>
            <TextInput
              onChangeText={setDraftRiderName}
              placeholder="Your display name"
              style={styles.profileDetailsInput}
              value={draftRiderName}
            />
            <Pressable onPress={savePersonalDetails} style={styles.profileDetailsSave}>
              <Text style={styles.profileDetailsSaveText}>Save details</Text>
            </Pressable>
          </View>
        )}
        <View style={styles.savedPlacesSection}>
          <View style={styles.savedPlacesHeader}>
            <View>
              <Text style={styles.savedPlacesTitle}>Saved places</Text>
              <Text style={styles.savedPlacesSubtitle}>
                Tap a place to use it as your destination.
              </Text>
            </View>
            <MaterialCommunityIcons name="map-marker-star-outline" color={gold} size={24} />
          </View>
          <View style={styles.savedPlacesGrid}>
            {savedPlaces.map((place) => (
              <Pressable
                key={place.label}
                onPress={() => useSavedPlace(place)}
                style={styles.savedPlaceCard}
              >
                <View style={styles.savedPlaceIcon}>
                  <MaterialCommunityIcons
                    name={place.icon as never}
                    color={green}
                    size={23}
                  />
                </View>
                <Text style={styles.savedPlaceLabel}>{place.label}</Text>
                <Text numberOfLines={1} style={styles.savedPlaceLocation}>
                  {place.location}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
        {false && profilePanel === "payment" && (
        <View style={styles.paymentSection}>
          <View style={styles.paymentHeader}>
            <View>
              <Text style={styles.paymentTitle}>Payment methods</Text>
              <Text style={styles.paymentSubtitle}>
                Choose how you pay for your tickets.
              </Text>
            </View>
            <MaterialCommunityIcons name="wallet-outline" color={green} size={24} />
          </View>
          <Pressable
            onPress={() =>
              Alert.alert(
                "Telebirr demo",
                "Demo payment is enabled. Your real Telebirr merchant connection can be added later without changing this screen.",
              )
            }
            style={styles.paymentMethodCard}
          >
            <View style={styles.profileTelebirrMark}>
              <Text style={styles.profileTelebirrMarkText}>tele</Text>
            </View>
            <View style={styles.paymentMethodCopy}>
              <Text style={styles.paymentMethodTitle}>Telebirr</Text>
              <Text style={styles.paymentMethodDetail}>
                Demo checkout · Ready for merchant setup
              </Text>
            </View>
            <View style={styles.paymentReadyPill}>
              <MaterialCommunityIcons name="check-circle" color="#0A9257" size={14} />
              <Text style={styles.paymentReadyText}>Demo</Text>
            </View>
          </Pressable>
          <View style={styles.paymentHint}>
            <MaterialCommunityIcons name="lock-outline" color="#71857B" size={15} />
            <Text style={styles.paymentHintText}>
              AddisGo never stores your payment PIN.
            </Text>
          </View>
        </View>
        )}
        {false && profilePanel === "emergency" && (
        <View style={styles.emergencySection}>
          <View style={styles.emergencyHeader}>
            <View>
              <Text style={styles.emergencyTitle}>Emergency contact</Text>
              <Text style={styles.emergencySubtitle}>
                Useful for long-distance travel.
              </Text>
            </View>
            <MaterialCommunityIcons name="shield-account-outline" color={green} size={25} />
          </View>
          {editingContact ? (
            <View style={styles.emergencyEditor}>
              <Text style={styles.emergencyEditorLabel}>Trusted contact name</Text>
              <TextInput
                onChangeText={setContactName}
                placeholder="Full name"
                style={styles.emergencyInput}
                value={contactName}
              />
              <Text style={styles.emergencyEditorLabel}>Phone number</Text>
              <TextInput
                keyboardType="phone-pad"
                onChangeText={setContactPhone}
                placeholder="+251..."
                style={styles.emergencyInput}
                value={contactPhone}
              />
              <View style={styles.emergencyEditorActions}>
                <Pressable onPress={() => setEditingContact(false)} style={styles.emergencyCancel}>
                  <Text style={styles.emergencyCancelText}>Cancel</Text>
                </Pressable>
                <Pressable onPress={saveEmergencyContact} style={styles.emergencySave}>
                  <Text style={styles.emergencySaveText}>Save contact</Text>
                </Pressable>
              </View>
            </View>
          ) : emergencyContact ? (
            <Pressable onPress={openContactEditor} style={styles.emergencyContactCard}>
              <View style={styles.emergencyContactIcon}>
                <MaterialCommunityIcons name="account-heart-outline" color={green} size={24} />
              </View>
              <View style={styles.emergencyContactCopy}>
                <Text style={styles.emergencyContactName}>{emergencyContact?.name}</Text>
                <Text style={styles.emergencyContactPhone}>{emergencyContact?.phone}</Text>
              </View>
              <MaterialCommunityIcons name="pencil-outline" color="#7C9085" size={20} />
            </Pressable>
          ) : (
            <Pressable onPress={openContactEditor} style={styles.emergencyEmptyCard}>
              <View style={styles.emergencyContactIcon}>
                <MaterialCommunityIcons name="plus" color={green} size={25} />
              </View>
              <View style={styles.emergencyContactCopy}>
                <Text style={styles.emergencyContactName}>Add an emergency contact</Text>
                <Text style={styles.emergencyContactPhone}>Choose someone we can notify if needed.</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" color="#7C9085" size={23} />
            </Pressable>
          )}
        </View>
        )}
        <View style={styles.connectionCard}>
          <View
            style={[
              styles.connectionDot,
              apiStatus === "connected"
                ? styles.connectionOnline
                : apiStatus === "checking"
                  ? styles.connectionChecking
                  : styles.connectionOffline,
            ]}
          />
          <View style={styles.connectionCopy}>
            <Text style={styles.connectionTitle}>
              {apiStatus === "connected"
                ? "FastAPI connected"
                : apiStatus === "checking"
                  ? "Checking connection"
                  : apiStatus === "offline"
                    ? "Using saved demo data"
                    : "Demo mode"}
            </Text>
            <Text style={styles.connectionText}>
              {apiStatus === "connected"
                ? "Available trips are synced from your API."
                : apiStatus === "offline"
                  ? "Your tickets remain available on this phone."
                  : "Add the API address later when you are ready."}
            </Text>
          </View>
          <Pressable
            accessibilityLabel="Refresh API connection"
            onPress={() => void refreshTrips()}
            style={styles.refreshButton}
          >
            <MaterialCommunityIcons name="refresh" color={green} size={19} />
          </Pressable>
        </View>
        <Pressable
          onPress={() => (signedIn ? void signOut() : setSignInVisible(true))}
          style={styles.continueButton}
        >
          <Text style={styles.continueButtonText}>
            {signedIn ? "Sign out" : "Sign in"}
          </Text>
        </Pressable>
      </View>
    );
  }

  const content =
    tab === "Home" ? (
      renderHome()
    ) : tab === "Bookings" ? (
      renderBooking()
    ) : tab === "My Trips" ? (
      renderTrips()
    ) : tab === "Profile" ? (
      renderProfile()
    ) : (
      <EmptyState
        title="Need help?"
        detail="For journey support, contact AddisGo customer care before your departure."
        action="Back to Home"
        onPress={() => setTab("Home")}
      />
    );
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="light" />
      <View style={styles.full}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.page}>
          {content}
        </ScrollView>
        <BottomNavigation active={tab} onChange={setTab} />
      </View>
      <SignInModal
        visible={signInVisible}
        phone={phone}
        setPhone={setPhone}
        onClose={() => setSignInVisible(false)}
        onSubmit={signIn}
      />
      <NotificationCenter
        visible={notificationsVisible}
        notifications={notifications}
        onClose={() => setNotificationsVisible(false)}
        onClear={clearNotifications}
      />
      <PaymentModal
        visible={paymentVisible}
        trip={selectedTrip}
        seat={selectedSeats.join(", ") || null}
        totalFare={selectedTrip ? bookingTotalFare(selectedTrip) : null}
        passengers={passengers}
        onClose={() => setPaymentVisible(false)}
        onConfirm={confirmPayment}
      />
      <BookingConfirmedModal
        ticket={confirmedTicket}
        onClose={() => {
          setConfirmedTicket(null);
          setTab("My Trips");
        }}
        onViewPass={() => {
          setDetailTicket(confirmedTicket);
          setConfirmedTicket(null);
          setTab("My Trips");
        }}
      />
      <LocationModal
        visible={locationField !== null}
        label={
          locationField === "from"
            ? "Where are you leaving from?"
            : "Where are you going?"
        }
        locations={locations}
        onClose={() => setLocationField(null)}
        onSelect={pickLocation}
      />
      <TicketModal
        ticket={detailTicket}
        onClose={() => setDetailTicket(null)}
      />
      <TripTrackingModal
        ticket={trackingTicket}
        onClose={() => setTrackingTicket(null)}
      />
    </SafeAreaView>
  );
}
