import { LinearGradient } from "expo-linear-gradient";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import QRCode from "react-native-qrcode-svg";
import Svg, { Circle, Path } from "react-native-svg";
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { destinationImages } from "./data";
import { styles } from "./styles";
import { gold, green, ink } from "./theme";
import type { AppNotification, Tab, Ticket, Trip } from "./types";
export function SwitchButton({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.switchChoice, active && styles.switchChoiceActive]}
    >
      <Text style={[styles.switchText, active && styles.switchTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
}
export function SearchRow({
  icon,
  label,
  value,
  onPress,
}: {
  icon: string;
  label: string;
  value: string;
  onPress?: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.searchRow}>
      <MaterialCommunityIcons
        name={icon as never}
        color={green}
        size={24}
        style={styles.rowIcon}
      />
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
      <MaterialCommunityIcons name="chevron-down" color="#5D7067" size={24} />
    </Pressable>
  );
}
export function Destination({
  name,
}: {
  name: keyof typeof destinationImages;
}) {
  return (
    <View style={styles.destination}>
      <Image source={destinationImages[name]} style={styles.destinationImage} />
      <LinearGradient
        colors={["transparent", "rgba(0,40,30,0.84)"]}
        style={styles.destinationOverlay}
      />
      <Text style={styles.destinationName}>{name}</Text>
    </View>
  );
}
export function RoutePreview({
  from,
  to,
  isLongDistance,
}: {
  from: string;
  to: string;
  isLongDistance: boolean;
}) {
  return (
    <View style={styles.routePreview}>
      <View style={styles.routeMap}>
        <Svg width="100%" height="48" viewBox="0 0 160 48">
          <Path
            d="M12 33 C42 1, 94 51, 145 15"
            fill="none"
            stroke={green}
            strokeDasharray="5 6"
            strokeWidth="3"
          />
          <Circle cx="12" cy="33" fill={green} r="7" />
          <Circle cx="145" cy="15" fill={green} r="7" />
        </Svg>
        <View style={styles.routePlaces}>
          <Text style={styles.routePlace}>{from}</Text>
          <Text style={styles.routePlace}>{to}</Text>
        </View>
      </View>
      <View style={styles.routeDivider} />
      <View style={styles.routeCopy}>
        <Text style={styles.routePreviewLabel}>
          {isLongDistance ? "YOUR JOURNEY" : "YOUR ROUTE"}
        </Text>
        <Text style={styles.routePreviewText}>
          {from} → {to}
        </Text>
      </View>
      <View style={styles.routeBus}>
        <MaterialCommunityIcons name="arrow-right" color={green} size={24} />
      </View>
    </View>
  );
}
export function QuickAccess({
  onSchedules,
  onTrips,
  onSupport,
}: {
  onSchedules: () => void;
  onTrips: () => void;
  onSupport: () => void;
}) {
  return (
    <View style={styles.quickSection}>
      <View style={styles.quickHeader}>
        <Text style={styles.quickTitle}>★ Quick Access</Text>
        <Text style={styles.quickSeeAll}>See All →</Text>
      </View>
      <View style={styles.quickRow}>
        <QuickItem icon="bus-clock" label="Schedules" onPress={onSchedules} />
        <QuickItem
          icon="map-marker-path"
          label="Routes Map"
          onPress={onSchedules}
        />
        <QuickItem icon="star-outline" label="Favorites" onPress={onTrips} />
        <QuickItem icon="headset" label="Support" onPress={onSupport} />
      </View>
    </View>
  );
}
export function QuickItem({
  icon,
  label,
  onPress,
}: {
  icon: string;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.quickItem}>
      <MaterialCommunityIcons name={icon as never} color={green} size={28} />
      <Text style={styles.quickLabel}>{label}</Text>
    </Pressable>
  );
}
export function ProgressStep({
  label,
  active = false,
}: {
  label: string;
  active?: boolean;
}) {
  return (
    <View style={styles.progressStep}>
      <View style={[styles.progressDot, active && styles.progressDotActive]}>
        <Text
          style={[
            styles.progressDotText,
            active && styles.progressDotTextActive,
          ]}
        >
          {active ? "✓" : "•"}
        </Text>
      </View>
      <Text
        style={[styles.progressLabel, active && styles.progressLabelActive]}
      >
        {label}
      </Text>
    </View>
  );
}
export function ProgressLine() {
  return <View style={styles.progressLine} />;
}
export function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendSquare, { backgroundColor: color }]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}
export function TripCard({
  trip,
  onPress,
}: {
  trip: Trip;
  onPress: () => void;
}) {
  return (
    <View style={styles.tripCard}>
      <View style={styles.tripLead}>
        <View style={styles.tripBusIcon}>
          <MaterialCommunityIcons name="bus" color={green} size={27} />
        </View>
        <View style={styles.tripInfo}>
          <Text style={styles.route}>{trip.route}</Text>
          <Text style={styles.operator}>{trip.operator}</Text>
          <Text style={styles.tripMeta}>
            {trip.departure} · {trip.duration} · {trip.seats} seats
          </Text>
        </View>
      </View>
      <View style={styles.tripAction}>
        <Text style={styles.fare}>{trip.fare}</Text>
        <Pressable onPress={onPress} style={styles.selectButton}>
          <Text style={styles.selectButtonText}>Select seat</Text>
        </Pressable>
      </View>
    </View>
  );
}
export function EmptyState({
  title,
  detail,
  action,
  onPress,
}: {
  title: string;
  detail: string;
  action: string;
  onPress: () => void;
}) {
  return (
    <View style={styles.empty}>
      <Text style={styles.screenTitle}>{title}</Text>
      <Text style={styles.screenText}>{detail}</Text>
      <Pressable onPress={onPress} style={styles.continueButton}>
        <Text style={styles.continueButtonText}>{action}</Text>
      </Pressable>
    </View>
  );
}
export function TripsEmptyState({ onPress }: { onPress: () => void }) {
  return (
    <View style={styles.tripsEmpty}>
      <View style={styles.emptyIllustration}>
        <View style={styles.emptyTicket}>
          <MaterialCommunityIcons
            name="ticket-confirmation-outline"
            color={green}
            size={48}
          />
        </View>
        <View style={styles.emptyBus}>
          <MaterialCommunityIcons name="bus" color="white" size={30} />
        </View>
      </View>
      <Text style={styles.emptyTitle}>Your trips will appear here</Text>
      <Text style={styles.emptyDetail}>
        Once you book a seat, your travel pass and QR ticket will be ready in
        one tap.
      </Text>
      <Pressable onPress={onPress} style={styles.emptyAction}>
        <MaterialCommunityIcons name="magnify" color="white" size={20} />
        <Text style={styles.emptyActionText}>Find a bus</Text>
      </Pressable>
      <Text style={styles.emptyHint}>Plan your next journey with AddisGo</Text>
    </View>
  );
}
export function ReceiptCard({
  ticket,
  onPress,
}: {
  ticket: Ticket;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.receipt}>
      <View style={styles.receiptInfo}>
        <Text style={styles.receiptLabel}>ADDISGO · PAID TICKET</Text>
        <Text style={styles.receiptRoute}>{ticket.route}</Text>
        <Text style={styles.receiptDetail}>
          {ticket.operator} · Seat {ticket.seat}
        </Text>
        <Text style={styles.receiptDetail}>
          {ticket.departure} · {ticket.paidAt}
        </Text>
        <Text style={styles.receiptReference}>Tap to open ticket</Text>
      </View>
      <View style={styles.qr}>
        <Text style={styles.qrText}>
          ▦{"\n"}▥{"\n"}▦
        </Text>
      </View>
    </Pressable>
  );
}
export function BottomNavigation({
  active,
  onChange,
}: {
  active: Tab;
  onChange: (tab: Tab) => void;
}) {
  const items: [string, Tab][] = [
    ["home-variant-outline", "Home"],
    ["map-marker-path", "My Trips"],
    ["ticket-confirmation-outline", "Bookings"],
    ["account-outline", "Profile"],
  ];
  return (
    <View style={styles.navigation}>
      {items.map(([icon, label]) => (
        <Pressable
          key={label}
          onPress={() => onChange(label)}
          style={styles.navItem}
        >
          <MaterialCommunityIcons
            name={icon as never}
            color={active === label ? green : "#677C71"}
            size={26}
          />
          <Text style={[styles.navLabel, active === label && styles.navActive]}>
            {label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

export function NotificationCenter({
  visible,
  notifications,
  onClose,
  onClear,
}: {
  visible: boolean;
  notifications: AppNotification[];
  onClose: () => void;
  onClear: () => void;
}) {
  return (
    <Modal
      transparent
      animationType="slide"
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.notificationBackdrop}>
        <View style={styles.notificationCard}>
          <View style={styles.notificationHeader}>
            <View>
              <Text style={styles.notificationTitle}>Notifications</Text>
              <Text style={styles.notificationSubtitle}>
                Booking and seat updates are saved on this phone.
              </Text>
            </View>
            <Pressable
              accessibilityLabel="Close notifications"
              onPress={onClose}
              style={styles.notificationClose}
            >
              <MaterialCommunityIcons name="close" color={ink} size={21} />
            </Pressable>
          </View>
          {notifications.length ? (
            <>
              <ScrollView
                style={styles.notificationScroll}
                contentContainerStyle={styles.notificationList}
                showsVerticalScrollIndicator={false}
              >
                {notifications.map((notification) => (
                  <View
                    key={notification.id}
                    style={[
                      styles.notificationItem,
                      !notification.read && styles.notificationItemUnread,
                    ]}
                  >
                    <View
                      style={[
                        styles.notificationIcon,
                        notification.tone === "success" &&
                          styles.notificationIconSuccess,
                        notification.tone === "warning" &&
                          styles.notificationIconWarning,
                      ]}
                    >
                      <MaterialCommunityIcons
                        name={
                          notification.tone === "success"
                            ? "check-circle-outline"
                            : notification.tone === "warning"
                              ? "clock-alert-outline"
                              : "seat-outline"
                        }
                        color={
                          notification.tone === "warning" ? "#9A6500" : green
                        }
                        size={22}
                      />
                    </View>
                    <View style={styles.notificationCopy}>
                      <Text style={styles.notificationItemTitle}>
                        {notification.title}
                      </Text>
                      <Text style={styles.notificationItemMessage}>
                        {notification.message}
                      </Text>
                      <Text style={styles.notificationItemTime}>
                        {formatNotificationTime(notification.createdAt)}
                      </Text>
                    </View>
                  </View>
                ))}
              </ScrollView>
              <Pressable onPress={onClear} style={styles.notificationClear}>
                <Text style={styles.notificationClearText}>Clear all</Text>
              </Pressable>
            </>
          ) : (
            <View style={styles.notificationEmpty}>
              <MaterialCommunityIcons
                name="bell-check-outline"
                color={green}
                size={34}
              />
              <Text style={styles.notificationEmptyTitle}>All caught up</Text>
              <Text style={styles.notificationEmptyText}>
                Your next booking or seat update will appear here.
              </Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

function formatNotificationTime(createdAt: string) {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return "Just now";

  return `${date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  })} · ${date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

export function SignInModal({
  visible,
  phone,
  setPhone,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  phone: string;
  setPhone: (phone: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  return (
    <Modal
      transparent
      animationType="slide"
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>Sign in to AddisGo</Text>
          <Text style={styles.modalDetail}>
            Use your Ethiopian mobile number. This is a safe demo sign-in; no
            real SMS is sent.
          </Text>
          <TextInput
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            style={styles.phoneInput}
            placeholder="+251913655539"
          />
          <Pressable onPress={onSubmit} style={styles.continueButton}>
            <Text style={styles.continueButtonText}>Continue</Text>
          </Pressable>
          <Pressable onPress={onClose} style={styles.cancelButton}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
export function PaymentModal({
  visible,
  trip,
  seat,
  onClose,
  onConfirm,
}: {
  visible: boolean;
  trip: Trip | null;
  seat: string | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal
      transparent
      animationType="slide"
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <View style={styles.paymentCard}>
          <View style={styles.paymentIcon}>
            <MaterialCommunityIcons
              name="wallet-outline"
              color={green}
              size={31}
            />
          </View>
          <Text style={styles.modalTitle}>Review your payment</Text>
          <Text style={styles.modalDetail}>
            Confirm your journey before AddisGo issues your ticket.
          </Text>
          <View style={styles.checkoutSteps}>
            <CheckoutStep icon="check" label="Review" active />
            <View style={styles.checkoutLine} />
            <CheckoutStep icon="credit-card-outline" label="Pay" active />
            <View style={styles.checkoutLine} />
            <CheckoutStep icon="ticket-confirmation-outline" label="Ticket" />
          </View>
          <View style={styles.paymentSummary}>
            <View>
              <Text style={styles.paymentKey}>JOURNEY</Text>
              <Text style={styles.paymentRoute}>{trip?.route}</Text>
              <Text style={styles.paymentDetail}>
                {trip?.operator} · Seat {seat}
              </Text>
            </View>
            <Text style={styles.paymentFare}>{trip?.fare}</Text>
          </View>
          <View style={styles.paymentMethod}>
            <View style={styles.telebirrMark}>
              <Text style={styles.telebirrMarkText}>T</Text>
            </View>
            <View>
              <Text style={styles.methodTitle}>Telebirr</Text>
              <Text style={styles.methodCaption}>
                Demo payment · no money charged
              </Text>
            </View>
            <MaterialCommunityIcons
              name="check-circle"
              color={green}
              size={22}
              style={styles.methodCheck}
            />
          </View>
          <Pressable onPress={onConfirm} style={styles.paymentButton}>
            <MaterialCommunityIcons
              name="lock-check-outline"
              color="white"
              size={19}
            />
            <Text style={styles.continueButtonText}>Confirm payment</Text>
          </Pressable>
          <Pressable onPress={onClose} style={styles.cancelButton}>
            <Text style={styles.cancelText}>Go back</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

export function BookingConfirmedModal({
  ticket,
  onClose,
  onViewPass,
}: {
  ticket: Ticket | null;
  onClose: () => void;
  onViewPass: () => void;
}) {
  return (
    <Modal
      transparent
      animationType="fade"
      visible={ticket !== null}
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <View style={styles.confirmationCard}>
          <View style={styles.confirmationIcon}>
            <MaterialCommunityIcons
              name="check-decagram"
              color="white"
              size={48}
            />
          </View>
          <Text style={styles.confirmationTitle}>Booking confirmed</Text>
          <Text style={styles.confirmationDetail}>
            Your AddisGo travel pass is ready. Keep it available when you board.
          </Text>
          <View style={styles.confirmationSummary}>
            <View>
              <Text style={styles.paymentKey}>JOURNEY</Text>
              <Text style={styles.confirmationRoute}>{ticket?.route}</Text>
              <Text style={styles.confirmationSeat}>
                {ticket?.operator} · Seat {ticket?.seat}
              </Text>
            </View>
            <Text style={styles.confirmationFare}>{ticket?.fare}</Text>
          </View>
          <View style={styles.referenceRow}>
            <MaterialCommunityIcons
              name="ticket-outline"
              color={green}
              size={19}
            />
            <Text style={styles.referenceText}>{ticket?.reference}</Text>
          </View>
          <Pressable onPress={onViewPass} style={styles.continueButton}>
            <MaterialCommunityIcons name="qrcode" color="white" size={19} />
            <Text style={styles.continueButtonText}>Open travel pass</Text>
          </Pressable>
          <Pressable onPress={onClose} style={styles.cancelButton}>
            <Text style={styles.cancelText}>View My Trips</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

export function CheckoutStep({
  icon,
  label,
  active = false,
}: {
  icon: string;
  label: string;
  active?: boolean;
}) {
  return (
    <View style={styles.checkoutStep}>
      <View style={[styles.checkoutDot, active && styles.checkoutDotActive]}>
        <MaterialCommunityIcons
          name={icon as never}
          color={active ? "white" : "#71877B"}
          size={13}
        />
      </View>
      <Text
        style={[styles.checkoutLabel, active && styles.checkoutLabelActive]}
      >
        {label}
      </Text>
    </View>
  );
}
export function LocationModal({
  visible,
  label,
  locations,
  onClose,
  onSelect,
}: {
  visible: boolean;
  label: string;
  locations: string[];
  onClose: () => void;
  onSelect: (location: string) => void;
}) {
  return (
    <Modal
      transparent
      animationType="slide"
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>{label}</Text>
          <Text style={styles.modalDetail}>
            Choose a stop to update your search.
          </Text>
          {locations.map((location) => (
            <Pressable
              key={location}
              onPress={() => onSelect(location)}
              style={styles.locationOption}
            >
              <Text style={styles.locationText}>● {location}</Text>
              <Text style={styles.locationArrow}>›</Text>
            </Pressable>
          ))}
          <Pressable onPress={onClose} style={styles.cancelButton}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
export function TicketModal({
  ticket,
  onClose,
}: {
  ticket: Ticket | null;
  onClose: () => void;
}) {
  const qrValue = ticket
    ? `addisgo://ticket/${ticket.reference}?seat=${ticket.seat}&route=${encodeURIComponent(ticket.route)}`
    : "addisgo://ticket";
  return (
    <Modal
      transparent
      animationType="slide"
      visible={ticket !== null}
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <ScrollView contentContainerStyle={styles.ticketModalScroll}>
          <View style={styles.ticketModal}>
            <Text style={styles.receiptLabel}>ADDISGO · YOUR TRAVEL PASS</Text>
            <Text style={styles.ticketTitle}>{ticket?.route}</Text>
            <View style={styles.ticketLine} />
            <View style={styles.ticketDetails}>
              <View>
                <Text style={styles.ticketKey}>OPERATOR</Text>
                <Text style={styles.ticketValue}>{ticket?.operator}</Text>
              </View>
              <View>
                <Text style={styles.ticketKey}>SEAT</Text>
                <Text style={styles.ticketValue}>{ticket?.seat}</Text>
              </View>
              <View>
                <Text style={styles.ticketKey}>DEPARTURE</Text>
                <Text style={styles.ticketValue}>{ticket?.departure}</Text>
              </View>
              <View>
                <Text style={styles.ticketKey}>FARE</Text>
                <Text style={styles.ticketValue}>{ticket?.fare}</Text>
              </View>
            </View>
            <JourneyTracker route={ticket?.route} />
            <View style={styles.largeQr}>
              <QRCode
                value={qrValue}
                size={164}
                color={ink}
                backgroundColor="white"
              />
            </View>
            <Text style={styles.ticketReference}>{ticket?.reference}</Text>
            <Text style={styles.ticketHint}>
              Scan or show this pass when boarding.
            </Text>
            <Pressable onPress={onClose} style={styles.continueButton}>
              <Text style={styles.continueButtonText}>Done</Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}
export function JourneyTracker({ route }: { route?: string }) {
  const [from, to] = route?.includes("→")
    ? route.split("→").map((place) => place.trim())
    : ["Megenagna", "Mexico Square"];
  return (
    <View style={styles.tracker}>
      <View style={styles.trackerHeader}>
        <View>
          <Text style={styles.trackerTitle}>Journey tracking</Text>
          <Text style={styles.trackerStatus}>● Scheduled</Text>
        </View>
        <MaterialCommunityIcons name="crosshairs-gps" color={green} size={23} />
      </View>
      <Svg width="100%" height="58" viewBox="0 0 300 58">
        <Path
          d="M18 40 C82 0, 186 59, 278 18"
          fill="none"
          stroke={green}
          strokeDasharray="6 6"
          strokeWidth="3"
        />
        <Circle cx="18" cy="40" fill={green} r="8" />
        <Circle cx="278" cy="18" fill={gold} r="8" />
      </Svg>
      <View style={styles.trackerStops}>
        <View>
          <Text style={styles.trackerStopLabel}>START</Text>
          <Text style={styles.trackerStop}>{from}</Text>
        </View>
        <View style={styles.trackerEnd}>
          <Text style={styles.trackerStopLabel}>DESTINATION</Text>
          <Text style={styles.trackerStop}>{to}</Text>
        </View>
      </View>
    </View>
  );
}
