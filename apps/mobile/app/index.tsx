import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ImageBackground,
  Pressable,
  ScrollView,
  Text,
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
  SearchRow,
  SignInModal,
  SwitchButton,
  TicketModal,
  TripCard,
  TripsEmptyState,
} from "./components";
import {
  cityStops,
  cityTrips,
  longStops,
  longTrips,
  notificationsKey,
  occupiedSeats,
  riderKey,
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
export default function Home() {
  const [service, setService] = useState<Service>("city");
  const [tab, setTab] = useState<Tab>("Home");
  const [signedIn, setSignedIn] = useState(false);
  const [phone, setPhone] = useState("+251");
  const [signInVisible, setSignInVisible] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [selectedSeat, setSelectedSeat] = useState<string | null>(null);
  const [seatHold, setSeatHold] = useState<{
    token: string;
    expiresAt: string;
  } | null>(null);
  const [holdingSeat, setHoldingSeat] = useState(false);
  const [searchComplete, setSearchComplete] = useState(false);
  const [searching, setSearching] = useState(false);
  const [paymentVisible, setPaymentVisible] = useState(false);
  const [confirmedTicket, setConfirmedTicket] = useState<Ticket | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [notificationsVisible, setNotificationsVisible] = useState(false);
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
  const [language, setLanguage] = useState<"en" | "am">("en");
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
  const locations = service === "city" ? cityStops : longStops;
  const am = language === "am";

  useEffect(() => {
    void restoreRiderData();
    void refreshTrips();
  }, []);

  useEffect(() => {
    if (!seatHold || !selectedSeat) return;

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
      setSelectedSeat((current) => (current === selectedSeat ? null : current));
      setPaymentVisible(false);
      addNotification({
        title: "Seat hold expired",
        message: `Seat ${selectedSeat} was released because payment was not completed in time.`,
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
        message: `Seat ${selectedSeat} will be released in one minute. Complete payment to keep it.`,
        tone: "warning",
      });
    }, Math.max(0, remainingMs - 60_000));
    const expiryTimer = setTimeout(expireHold, remainingMs);

    return () => {
      clearTimeout(warningTimer);
      clearTimeout(expiryTimer);
    };
  }, [demoUserId, seatHold, selectedSeat]);

  async function restoreRiderData() {
    try {
      const [storedTickets, storedRider, storedNotifications] =
        await AsyncStorage.multiGet([ticketsKey, riderKey, notificationsKey]);
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
  function searchBuses() {
    setSearching(true);
    setSearchComplete(false);
    setTimeout(() => {
      setSearching(false);
      setSearchComplete(true);
    }, 550);
  }

  function chooseTrip(trip: Trip) {
    void clearSeatHold();
    setSelectedTrip(trip);
    setSelectedSeat(null);
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
    if (!selectedTrip || holdingSeat || seat === selectedSeat) return;
    await clearSeatHold();
    setSelectedSeat(seat);
    const isRemoteTrip = remoteTrips.some(
      (trip) => trip.id === selectedTrip.id,
    );
    if (!demoUserId || !isRemoteTrip || !isApiConfigured()) return;

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
      setSelectedSeat(null);
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
    if (!selectedSeat) {
      Alert.alert("Choose a seat", "Please select a seat before continuing.");
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
    if (!selectedTrip || !selectedSeat) return;
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
            seatNumber: selectedSeat,
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
        setSelectedSeat(null);
        return;
      }
    }
    const ticket: Ticket = {
      ...selectedTrip,
      seat: selectedSeat,
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
    setSelectedSeat(null);
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
                  onPress={() => setLanguage(am ? "en" : "am")}
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
          <SearchRow
            icon="map-marker"
            label="From"
            value={from}
            onPress={() => setLocationField("from")}
          />
          <SearchRow
            icon="flag-variant"
            label="To"
            value={to}
            onPress={() => setLocationField("to")}
          />
          {service === "long" && (
            <>
              <SearchRow
                icon="calendar-month"
                label="Date"
                value="Today, 02 Nov"
              />
              <SearchRow
                icon="account-group-outline"
                label="Passengers"
                value="1 passenger"
              />
            </>
          )}
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
            <Text style={styles.searchResult}>
              {visibleTrips.length
                ? `${visibleTrips.length} matching ${visibleTrips.length === 1 ? "trip" : "trips"} found. Select a seat to continue.`
                : "No matching departures yet. Try a different route or time."}
            </Text>
          )}
        </View>
        <RoutePreview from={from} to={to} isLongDistance={service === "long"} />
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
          <Text style={styles.sectionTitle}>Available departures</Text>
          <Text style={styles.viewAll}>{visibleTrips.length} trips</Text>
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
          <Text style={styles.summaryFare}>{selectedTrip.fare}</Text>
        </View>
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
                disabled={occupiedSeats.has(seat) || holdingSeat}
                onPress={() => void selectSeat(seat)}
                style={[
                  styles.seat,
                  index % 4 === 2 && styles.aisleSpace,
                  occupiedSeats.has(seat) && styles.seatTaken,
                  selectedSeat === seat && styles.seatSelected,
                ]}
              >
                <Text
                  style={[
                    styles.seatText,
                    occupiedSeats.has(seat) && styles.seatTextTaken,
                    selectedSeat === seat && styles.seatTextSelected,
                  ]}
                >
                  {seat}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
        {selectedSeat && (
          <Text style={styles.seatHoldText}>
            {holdingSeat
              ? `Holding seat ${selectedSeat}…`
              : seatHold
                ? `Seat ${selectedSeat} is held until ${new Date(seatHold.expiresAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}.`
                : `Seat ${selectedSeat} is selected.`}
          </Text>
        )}
        <Pressable onPress={pay} style={styles.continueButton}>
          <Text style={styles.continueButtonText}>
            {selectedSeat
              ? `Continue with seat ${selectedSeat}`
              : "Select a seat"}
          </Text>
        </Pressable>
      </View>
    );
  }

  function renderTrips() {
    if (!tickets.length)
      return <TripsEmptyState onPress={() => setTab("Home")} />;
    return (
      <View style={styles.screenPadding}>
        <Text style={styles.screenTitle}>My trips</Text>
        <Text style={styles.screenText}>
          Your paid ticket receipts are saved on this device.
        </Text>
        {tickets.map((ticket) => (
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
    return (
      <View style={styles.screenPadding}>
        <Text style={styles.screenTitle}>
          {signedIn ? "You are signed in" : "Welcome to AddisGo"}
        </Text>
        <Text style={styles.screenText}>
          {signedIn
            ? `Signed in with ${phone}.`
            : "Sign in with your Ethiopian mobile number to reserve a seat."}
        </Text>
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
        seat={selectedSeat}
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
    </SafeAreaView>
  );
}
