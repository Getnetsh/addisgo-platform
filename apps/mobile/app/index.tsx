import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
import { ActivityIndicator, Alert, Image, ImageBackground, Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { styles } from "./styles";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import Svg, { Circle, Path } from "react-native-svg";
import QRCode from "react-native-qrcode-svg";

type Service = "city" | "long";
type Tab = "Home" | "My Trips" | "Bookings" | "Support" | "Profile";
type Trip = { id: string; route: string; operator: string; fare: string; departure: string; duration: string; seats: number };
type Ticket = Trip & { reference: string; seat: string; paidAt: string };
type TimeFilter = "Today" | "Morning" | "Afternoon" | "Evening";

const green = "#075C45";
const darkGreen = "#043C2E";
const gold = "#F0AF24";
const ink = "#102D25";

const cityTrips: Trip[] = [
  { id: "city-101", route: "Route 101", operator: "Sheger City Bus", fare: "ETB 12", departure: "08:10", duration: "32 min", seats: 32 },
  { id: "city-74", route: "Route 74", operator: "Anbessa City Bus", fare: "ETB 10", departure: "08:25", duration: "40 min", seats: 28 },
  { id: "city-22", route: "Route 22", operator: "Sheger City Bus", fare: "ETB 12", departure: "13:15", duration: "28 min", seats: 19 },
  { id: "city-16", route: "Route 16", operator: "Anbessa City Bus", fare: "ETB 10", departure: "18:10", duration: "35 min", seats: 16 },
];
const longTrips: Trip[] = [
  { id: "long-hawassa", route: "Addis Ababa → Hawassa", operator: "Selam Bus", fare: "ETB 650", departure: "06:30", duration: "5h 30m", seats: 32 },
  { id: "long-bahir-dar", route: "Addis Ababa → Bahir Dar", operator: "Sky Bus", fare: "ETB 900", departure: "07:00", duration: "9h", seats: 28 },
];
const seats = ["1A", "1B", "1C", "1D", "2A", "2B", "2C", "2D", "3A", "3B", "3C", "3D"];
const occupiedSeats = new Set(["1B", "2C", "3A"]);
const cityStops = ["Megenagna", "Mexico Square", "Piassa", "Bole", "Lideta"];
const longStops = ["Addis Ababa", "Hawassa", "Bahir Dar", "Dire Dawa", "Adama"];
const destinationImages = {
  Hawassa: require("../assets/destinations/hawassa.png"),
  "Bahir Dar": require("../assets/destinations/bahir-dar.png"),
  "Dire Dawa": require("../assets/destinations/dire-dawa.png"),
};

export default function Home() {
  const [service, setService] = useState<Service>("city");
  const [tab, setTab] = useState<Tab>("Home");
  const [signedIn, setSignedIn] = useState(false);
  const [phone, setPhone] = useState("+251");
  const [signInVisible, setSignInVisible] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [selectedSeat, setSelectedSeat] = useState<string | null>(null);
  const [searchComplete, setSearchComplete] = useState(false);
  const [searching, setSearching] = useState(false);
  const [paymentVisible, setPaymentVisible] = useState(false);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [from, setFrom] = useState("Megenagna");
  const [to, setTo] = useState("Mexico Square");
  const [locationField, setLocationField] = useState<"from" | "to" | null>(null);
  const [detailTicket, setDetailTicket] = useState<Ticket | null>(null);
  const [language, setLanguage] = useState<"en" | "am">("en");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("Today");
  const trips = service === "city" ? cityTrips : longTrips;
  const visibleTrips = trips.filter((trip) => {
    if (timeFilter === "Today") return true;
    const hour = Number(trip.departure.split(":")[0]);
    if (timeFilter === "Morning") return hour < 12;
    if (timeFilter === "Afternoon") return hour >= 12 && hour < 17;
    return hour >= 17;
  });
  const locations = service === "city" ? cityStops : longStops;
  const am = language === "am";

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
    if (locationField === "from") setFrom(value);
    if (locationField === "to") setTo(value);
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
    setSelectedTrip(trip);
    setSelectedSeat(null);
    if (!signedIn) setSignInVisible(true);
    else setTab("Bookings");
  }
  function signIn() {
    if (!/^\+251\d{9}$/.test(phone)) {
      Alert.alert("Enter a valid number", "Example: +251913655539");
      return;
    }
    setSignedIn(true);
    setSignInVisible(false);
    setTab("Bookings");
  }
  function pay() {
    if (!selectedSeat) {
      Alert.alert("Choose a seat", "Please select a seat before continuing.");
      return;
    }
    setPaymentVisible(true);
  }
  function confirmPayment() {
    if (!selectedTrip || !selectedSeat) return;
    setTickets((current) => [{
      ...selectedTrip,
      seat: selectedSeat,
      reference: `AG-${Date.now().toString().slice(-6)}`,
      paidAt: new Date().toLocaleDateString(),
    }, ...current]);
    setPaymentVisible(false);
    setSelectedSeat(null);
    setSelectedTrip(null);
    setTab("My Trips");
  }

  function renderHome() {
    return <>
      <ImageBackground source={require("../assets/addis-hero.png")} style={styles.hero} imageStyle={styles.heroImage}>
        <LinearGradient colors={["rgba(0,76,56,0.94)", "rgba(0,93,68,0.60)", "rgba(0,55,39,0.08)"]} style={styles.heroOverlay}>
          <View style={styles.topRow}>
            <View>
              <View style={styles.brandRow}><MaterialCommunityIcons name="bus" color={gold} size={31} /><Text style={styles.brand}>Addis<Text style={styles.brandLight}>Go</Text></Text></View>
              <Text style={styles.brandTagline}>Travel Smart. Move Together.</Text>
            </View>
            <View style={styles.topActions}>
              <Pressable onPress={() => setLanguage(am ? "en" : "am")} style={styles.languageButton}>
                <Text style={styles.languageText}>{am ? "EN" : "አማ"}</Text>
              </Pressable>
              <Pressable onPress={() => setTab("Profile")} style={styles.accountButton}>
                <MaterialCommunityIcons name="bell-outline" color={green} size={22} />
                <View style={styles.notificationDot} />
              </Pressable>
            </View>
          </View>
          <Text style={styles.eyebrow}>{am ? "የኢትዮጵያ የአውቶቡስ ጉዞ ጓደኛ" : "ETHIOPIA’S BUS TRAVEL COMPANION"}</Text>
          <Text style={styles.heroTitle}>{service === "city" ? (am ? "በአዲስ አበባ ይጓዙ" : <>Move around{"\n"}<Text style={styles.heroGold}>Addis</Text></>) : (am ? "በኢትዮጵያ ይጓዙ" : "Travel across Ethiopia")}</Text>
          <Text style={styles.heroSubtitle}>{am ? "ቀላል፣ ፈጣን እና አስተማማኝ የአውቶቡስ ጉዞ።" : service === "city" ? "Fast, clear city routes for everyday movement." : "Find comfortable travel to Ethiopia’s cities."}</Text>
        </LinearGradient>
      </ImageBackground>

      <View style={styles.searchCard}>
        <View style={styles.serviceSwitch}>
          <SwitchButton active={service === "city"} label={am ? "የከተማ አውቶቡስ" : "City bus"} onPress={() => changeService("city")} />
          <SwitchButton active={service === "long"} label={am ? "ረጅም ርቀት" : "Long distance"} onPress={() => changeService("long")} />
        </View>
        <SearchRow icon="map-marker" label="From" value={from} onPress={() => setLocationField("from")} />
        <SearchRow icon="flag-variant" label="To" value={to} onPress={() => setLocationField("to")} />
        {service === "long" && <>
          <SearchRow icon="calendar-month" label="Date" value="Today, 02 Nov" />
          <SearchRow icon="account-group-outline" label="Passengers" value="1 passenger" />
        </>}
        <Pressable disabled={searching} onPress={searchBuses} style={[styles.searchButton, searching && styles.searchButtonLoading]}>
          {searching ? <ActivityIndicator color="white" /> : <Text style={styles.searchButtonText}>{am ? "⌕  አውቶቡሶችን ፈልግ" : "⌕  Search buses"}</Text>}
        </Pressable>
        {searchComplete && <Text style={styles.searchResult}>Trips found below. Select a seat to continue.</Text>}
      </View>
      <RoutePreview from={from} to={to} isLongDistance={service === "long"} />
      {service === "city" && <QuickAccess onSchedules={() => setSearchComplete(true)} onTrips={() => setTab("My Trips")} onSupport={() => setTab("Support")} />}

      {service === "long" && <View style={styles.popularSection}>
        <Text style={styles.sectionTitle}>Popular destinations</Text>
        <View style={styles.destinationRow}>
          <Destination name="Hawassa" />
          <Destination name="Bahir Dar" />
          <Destination name="Dire Dawa" />
        </View>
      </View>}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Available departures</Text>
        <Text style={styles.viewAll}>{visibleTrips.length} trips</Text>
      </View>
      <View style={styles.filterRow}>
        {(["Today", "Morning", "Afternoon", "Evening"] as TimeFilter[]).map((filter) => <Pressable key={filter} onPress={() => setTimeFilter(filter)} style={[styles.filterChip, timeFilter === filter && styles.filterChipActive]}><Text style={[styles.filterChipText, timeFilter === filter && styles.filterChipTextActive]}>{filter}</Text></Pressable>)}
      </View>
      {visibleTrips.map((trip) => <TripCard key={trip.id} trip={trip} onPress={() => chooseTrip(trip)} />)}
      {!visibleTrips.length && <Text style={styles.noTrips}>No departures in this time range. Try another filter.</Text>}
    </>;
  }

  function renderBooking() {
    if (!selectedTrip) return <EmptyState title="Choose your journey" detail="Search routes from Home, then select your bus and seat." action="Browse buses" onPress={() => setTab("Home")} />;
    return <View style={styles.screenPadding}>
      <Text style={styles.screenTitle}>Choose your seat</Text>
      <Text style={styles.screenText}>{selectedTrip.route} · {selectedTrip.departure}</Text>
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
        <View style={styles.busHeader}><Text style={styles.busHeaderText}>DRIVER</Text><Text style={styles.busHeaderText}>Front of bus</Text></View>
        <View style={styles.legend}><Legend color={green} label="Selected" /><Legend color="#FFFFFF" label="Available" /><Legend color="#D6DED9" label="Taken" /></View>
        <View style={styles.seatGrid}>
          {seats.map((seat, index) => <Pressable key={seat} disabled={occupiedSeats.has(seat)} onPress={() => setSelectedSeat(seat)} style={[styles.seat, index % 4 === 2 && styles.aisleSpace, occupiedSeats.has(seat) && styles.seatTaken, selectedSeat === seat && styles.seatSelected]}>
            <Text style={[styles.seatText, occupiedSeats.has(seat) && styles.seatTextTaken, selectedSeat === seat && styles.seatTextSelected]}>{seat}</Text>
          </Pressable>)}
        </View>
      </View>
      <Pressable onPress={pay} style={styles.continueButton}>
        <Text style={styles.continueButtonText}>{selectedSeat ? `Continue with seat ${selectedSeat}` : "Select a seat"}</Text>
      </Pressable>
    </View>;
  }

  function renderTrips() {
    if (!tickets.length) return <TripsEmptyState onPress={() => setTab("Home")} />;
    return <View style={styles.screenPadding}>
      <Text style={styles.screenTitle}>My trips</Text>
      <Text style={styles.screenText}>Your paid ticket receipts are saved on this device.</Text>
      {tickets.map((ticket) => <ReceiptCard key={ticket.reference} ticket={ticket} onPress={() => setDetailTicket(ticket)} />)}
    </View>;
  }

  function renderProfile() {
    return <View style={styles.screenPadding}>
      <Text style={styles.screenTitle}>{signedIn ? "You are signed in" : "Welcome to AddisGo"}</Text>
      <Text style={styles.screenText}>{signedIn ? `Signed in with ${phone}.` : "Sign in with your Ethiopian mobile number to reserve a seat."}</Text>
      <Pressable onPress={() => signedIn ? setSignedIn(false) : setSignInVisible(true)} style={styles.continueButton}>
        <Text style={styles.continueButtonText}>{signedIn ? "Sign out" : "Sign in"}</Text>
      </Pressable>
    </View>;
  }

  const content = tab === "Home" ? renderHome() : tab === "Bookings" ? renderBooking() : tab === "My Trips" ? renderTrips() : tab === "Profile" ? renderProfile() : <EmptyState title="Need help?" detail="For journey support, contact AddisGo customer care before your departure." action="Back to Home" onPress={() => setTab("Home")} />;
  return <SafeAreaView style={styles.safe}>
    <StatusBar style="light" />
    <View style={styles.full}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.page}>{content}</ScrollView>
      <BottomNavigation active={tab} onChange={setTab} />
    </View>
    <SignInModal visible={signInVisible} phone={phone} setPhone={setPhone} onClose={() => setSignInVisible(false)} onSubmit={signIn} />
    <PaymentModal visible={paymentVisible} trip={selectedTrip} seat={selectedSeat} onClose={() => setPaymentVisible(false)} onConfirm={confirmPayment} />
    <LocationModal visible={locationField !== null} label={locationField === "from" ? "Where are you leaving from?" : "Where are you going?"} locations={locations} onClose={() => setLocationField(null)} onSelect={pickLocation} />
    <TicketModal ticket={detailTicket} onClose={() => setDetailTicket(null)} />
  </SafeAreaView>;
}

function SwitchButton({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return <Pressable onPress={onPress} style={[styles.switchChoice, active && styles.switchChoiceActive]}><Text style={[styles.switchText, active && styles.switchTextActive]}>{label}</Text></Pressable>;
}
function SearchRow({ icon, label, value, onPress }: { icon: string; label: string; value: string; onPress?: () => void }) {
  return <Pressable onPress={onPress} style={styles.searchRow}><MaterialCommunityIcons name={icon as never} color={green} size={24} style={styles.rowIcon} /><Text style={styles.rowLabel}>{label}</Text><Text style={styles.rowValue}>{value}</Text><MaterialCommunityIcons name="chevron-down" color="#5D7067" size={24} /></Pressable>;
}
function Destination({ name }: { name: keyof typeof destinationImages }) {
  return <View style={styles.destination}><Image source={destinationImages[name]} style={styles.destinationImage} /><LinearGradient colors={["transparent", "rgba(0,40,30,0.84)"]} style={styles.destinationOverlay} /><Text style={styles.destinationName}>{name}</Text></View>;
}
function RoutePreview({ from, to, isLongDistance }: { from: string; to: string; isLongDistance: boolean }) {
  return <View style={styles.routePreview}><View style={styles.routeMap}><Svg width="100%" height="48" viewBox="0 0 160 48"><Path d="M12 33 C42 1, 94 51, 145 15" fill="none" stroke={green} strokeDasharray="5 6" strokeWidth="3" /><Circle cx="12" cy="33" fill={green} r="7" /><Circle cx="145" cy="15" fill={green} r="7" /></Svg><View style={styles.routePlaces}><Text style={styles.routePlace}>{from}</Text><Text style={styles.routePlace}>{to}</Text></View></View><View style={styles.routeDivider} /><View style={styles.routeCopy}><Text style={styles.routePreviewLabel}>{isLongDistance ? "YOUR JOURNEY" : "YOUR ROUTE"}</Text><Text style={styles.routePreviewText}>{from} → {to}</Text></View><View style={styles.routeBus}><MaterialCommunityIcons name="arrow-right" color={green} size={24} /></View></View>;
}
function QuickAccess({ onSchedules, onTrips, onSupport }: { onSchedules: () => void; onTrips: () => void; onSupport: () => void }) {
  return <View style={styles.quickSection}><View style={styles.quickHeader}><Text style={styles.quickTitle}>★  Quick Access</Text><Text style={styles.quickSeeAll}>See All →</Text></View><View style={styles.quickRow}><QuickItem icon="bus-clock" label="Schedules" onPress={onSchedules} /><QuickItem icon="map-marker-path" label="Routes Map" onPress={onSchedules} /><QuickItem icon="star-outline" label="Favorites" onPress={onTrips} /><QuickItem icon="headset" label="Support" onPress={onSupport} /></View></View>;
}
function QuickItem({ icon, label, onPress }: { icon: string; label: string; onPress: () => void }) {
  return <Pressable onPress={onPress} style={styles.quickItem}><MaterialCommunityIcons name={icon as never} color={green} size={28} /><Text style={styles.quickLabel}>{label}</Text></Pressable>;
}
function ProgressStep({ label, active = false }: { label: string; active?: boolean }) {
  return <View style={styles.progressStep}><View style={[styles.progressDot, active && styles.progressDotActive]}><Text style={[styles.progressDotText, active && styles.progressDotTextActive]}>{active ? "✓" : "•"}</Text></View><Text style={[styles.progressLabel, active && styles.progressLabelActive]}>{label}</Text></View>;
}
function ProgressLine() {
  return <View style={styles.progressLine} />;
}
function Legend({ color, label }: { color: string; label: string }) {
  return <View style={styles.legendItem}><View style={[styles.legendSquare, { backgroundColor: color }]} /><Text style={styles.legendText}>{label}</Text></View>;
}
function TripCard({ trip, onPress }: { trip: Trip; onPress: () => void }) {
  return <View style={styles.tripCard}><View style={styles.tripLead}><View style={styles.tripBusIcon}><MaterialCommunityIcons name="bus" color={green} size={27} /></View><View style={styles.tripInfo}><Text style={styles.route}>{trip.route}</Text><Text style={styles.operator}>{trip.operator}</Text><Text style={styles.tripMeta}>{trip.departure} · {trip.duration} · {trip.seats} seats</Text></View></View><View style={styles.tripAction}><Text style={styles.fare}>{trip.fare}</Text><Pressable onPress={onPress} style={styles.selectButton}><Text style={styles.selectButtonText}>Select seat</Text></Pressable></View></View>;
}
function EmptyState({ title, detail, action, onPress }: { title: string; detail: string; action: string; onPress: () => void }) {
  return <View style={styles.empty}><Text style={styles.screenTitle}>{title}</Text><Text style={styles.screenText}>{detail}</Text><Pressable onPress={onPress} style={styles.continueButton}><Text style={styles.continueButtonText}>{action}</Text></Pressable></View>;
}
function TripsEmptyState({ onPress }: { onPress: () => void }) {
  return <View style={styles.tripsEmpty}><View style={styles.emptyIllustration}><View style={styles.emptyTicket}><MaterialCommunityIcons name="ticket-confirmation-outline" color={green} size={48} /></View><View style={styles.emptyBus}><MaterialCommunityIcons name="bus" color="white" size={30} /></View></View><Text style={styles.emptyTitle}>Your trips will appear here</Text><Text style={styles.emptyDetail}>Once you book a seat, your travel pass and QR ticket will be ready in one tap.</Text><Pressable onPress={onPress} style={styles.emptyAction}><MaterialCommunityIcons name="magnify" color="white" size={20} /><Text style={styles.emptyActionText}>Find a bus</Text></Pressable><Text style={styles.emptyHint}>Plan your next journey with AddisGo</Text></View>;
}
function ReceiptCard({ ticket, onPress }: { ticket: Ticket; onPress: () => void }) {
  return <Pressable onPress={onPress} style={styles.receipt}><View style={styles.receiptInfo}><Text style={styles.receiptLabel}>ADDISGO · PAID TICKET</Text><Text style={styles.receiptRoute}>{ticket.route}</Text><Text style={styles.receiptDetail}>{ticket.operator} · Seat {ticket.seat}</Text><Text style={styles.receiptDetail}>{ticket.departure} · {ticket.paidAt}</Text><Text style={styles.receiptReference}>Tap to open ticket</Text></View><View style={styles.qr}><Text style={styles.qrText}>▦{"\n"}▥{"\n"}▦</Text></View></Pressable>;
}
function BottomNavigation({ active, onChange }: { active: Tab; onChange: (tab: Tab) => void }) {
  const items: [string, Tab][] = [["home-variant-outline", "Home"], ["map-marker-path", "My Trips"], ["ticket-confirmation-outline", "Bookings"], ["account-outline", "Profile"]];
  return <View style={styles.navigation}>{items.map(([icon, label]) => <Pressable key={label} onPress={() => onChange(label)} style={styles.navItem}><MaterialCommunityIcons name={icon as never} color={active === label ? green : "#677C71"} size={26} /><Text style={[styles.navLabel, active === label && styles.navActive]}>{label}</Text></Pressable>)}</View>;
}
function SignInModal({ visible, phone, setPhone, onClose, onSubmit }: { visible: boolean; phone: string; setPhone: (phone: string) => void; onClose: () => void; onSubmit: () => void }) {
  return <Modal transparent animationType="slide" visible={visible} onRequestClose={onClose}><View style={styles.modalBackdrop}><View style={styles.modalCard}><Text style={styles.modalTitle}>Sign in to AddisGo</Text><Text style={styles.modalDetail}>Use your Ethiopian mobile number. This is a safe demo sign-in; no real SMS is sent.</Text><TextInput value={phone} onChangeText={setPhone} keyboardType="phone-pad" style={styles.phoneInput} placeholder="+251913655539" /><Pressable onPress={onSubmit} style={styles.continueButton}><Text style={styles.continueButtonText}>Continue</Text></Pressable><Pressable onPress={onClose} style={styles.cancelButton}><Text style={styles.cancelText}>Cancel</Text></Pressable></View></View></Modal>;
}
function PaymentModal({ visible, trip, seat, onClose, onConfirm }: { visible: boolean; trip: Trip | null; seat: string | null; onClose: () => void; onConfirm: () => void }) {
  return <Modal transparent animationType="slide" visible={visible} onRequestClose={onClose}><View style={styles.modalBackdrop}><View style={styles.paymentCard}><View style={styles.paymentIcon}><MaterialCommunityIcons name="wallet-outline" color={green} size={31} /></View><Text style={styles.modalTitle}>Review your payment</Text><Text style={styles.modalDetail}>Confirm your journey before AddisGo issues your ticket.</Text><View style={styles.checkoutSteps}><CheckoutStep icon="check" label="Review" active /><View style={styles.checkoutLine} /><CheckoutStep icon="credit-card-outline" label="Pay" active /><View style={styles.checkoutLine} /><CheckoutStep icon="ticket-confirmation-outline" label="Ticket" /></View><View style={styles.paymentSummary}><View><Text style={styles.paymentKey}>JOURNEY</Text><Text style={styles.paymentRoute}>{trip?.route}</Text><Text style={styles.paymentDetail}>{trip?.operator} · Seat {seat}</Text></View><Text style={styles.paymentFare}>{trip?.fare}</Text></View><View style={styles.paymentMethod}><View style={styles.telebirrMark}><Text style={styles.telebirrMarkText}>T</Text></View><View><Text style={styles.methodTitle}>Telebirr</Text><Text style={styles.methodCaption}>Demo payment · no money charged</Text></View><MaterialCommunityIcons name="check-circle" color={green} size={22} style={styles.methodCheck} /></View><Pressable onPress={onConfirm} style={styles.paymentButton}><MaterialCommunityIcons name="lock-check-outline" color="white" size={19} /><Text style={styles.continueButtonText}>Confirm payment</Text></Pressable><Pressable onPress={onClose} style={styles.cancelButton}><Text style={styles.cancelText}>Go back</Text></Pressable></View></View></Modal>;
}
function CheckoutStep({ icon, label, active = false }: { icon: string; label: string; active?: boolean }) {
  return <View style={styles.checkoutStep}><View style={[styles.checkoutDot, active && styles.checkoutDotActive]}><MaterialCommunityIcons name={icon as never} color={active ? "white" : "#71877B"} size={13} /></View><Text style={[styles.checkoutLabel, active && styles.checkoutLabelActive]}>{label}</Text></View>;
}
function LocationModal({ visible, label, locations, onClose, onSelect }: { visible: boolean; label: string; locations: string[]; onClose: () => void; onSelect: (location: string) => void }) {
  return <Modal transparent animationType="slide" visible={visible} onRequestClose={onClose}><View style={styles.modalBackdrop}><View style={styles.modalCard}><Text style={styles.modalTitle}>{label}</Text><Text style={styles.modalDetail}>Choose a stop to update your search.</Text>{locations.map((location) => <Pressable key={location} onPress={() => onSelect(location)} style={styles.locationOption}><Text style={styles.locationText}>●  {location}</Text><Text style={styles.locationArrow}>›</Text></Pressable>)}<Pressable onPress={onClose} style={styles.cancelButton}><Text style={styles.cancelText}>Cancel</Text></Pressable></View></View></Modal>;
}
function TicketModal({ ticket, onClose }: { ticket: Ticket | null; onClose: () => void }) {
  const qrValue = ticket ? `addisgo://ticket/${ticket.reference}?seat=${ticket.seat}&route=${encodeURIComponent(ticket.route)}` : "addisgo://ticket";
  return <Modal transparent animationType="slide" visible={ticket !== null} onRequestClose={onClose}><View style={styles.modalBackdrop}><ScrollView contentContainerStyle={styles.ticketModalScroll}><View style={styles.ticketModal}><Text style={styles.receiptLabel}>ADDISGO · YOUR TRAVEL PASS</Text><Text style={styles.ticketTitle}>{ticket?.route}</Text><View style={styles.ticketLine} /><View style={styles.ticketDetails}><View><Text style={styles.ticketKey}>OPERATOR</Text><Text style={styles.ticketValue}>{ticket?.operator}</Text></View><View><Text style={styles.ticketKey}>SEAT</Text><Text style={styles.ticketValue}>{ticket?.seat}</Text></View><View><Text style={styles.ticketKey}>DEPARTURE</Text><Text style={styles.ticketValue}>{ticket?.departure}</Text></View><View><Text style={styles.ticketKey}>FARE</Text><Text style={styles.ticketValue}>{ticket?.fare}</Text></View></View><JourneyTracker route={ticket?.route} /><View style={styles.largeQr}><QRCode value={qrValue} size={164} color={ink} backgroundColor="white" /></View><Text style={styles.ticketReference}>{ticket?.reference}</Text><Text style={styles.ticketHint}>Scan or show this pass when boarding.</Text><Pressable onPress={onClose} style={styles.continueButton}><Text style={styles.continueButtonText}>Done</Text></Pressable></View></ScrollView></View></Modal>;
}
function JourneyTracker({ route }: { route?: string }) {
  const [from, to] = route?.includes("→") ? route.split("→").map((place) => place.trim()) : ["Megenagna", "Mexico Square"];
  return <View style={styles.tracker}><View style={styles.trackerHeader}><View><Text style={styles.trackerTitle}>Journey tracking</Text><Text style={styles.trackerStatus}>● Scheduled</Text></View><MaterialCommunityIcons name="crosshairs-gps" color={green} size={23} /></View><Svg width="100%" height="58" viewBox="0 0 300 58"><Path d="M18 40 C82 0, 186 59, 278 18" fill="none" stroke={green} strokeDasharray="6 6" strokeWidth="3" /><Circle cx="18" cy="40" fill={green} r="8" /><Circle cx="278" cy="18" fill={gold} r="8" /></Svg><View style={styles.trackerStops}><View><Text style={styles.trackerStopLabel}>START</Text><Text style={styles.trackerStop}>{from}</Text></View><View style={styles.trackerEnd}><Text style={styles.trackerStopLabel}>DESTINATION</Text><Text style={styles.trackerStop}>{to}</Text></View></View></View>;
}
