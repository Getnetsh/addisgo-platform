from contextlib import asynccontextmanager
from datetime import datetime, timezone
import logging
from typing import Annotated

from fastapi import Depends, FastAPI, Header, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .schemas import (
    BookingCreate,
    BookingResponse,
    DemoSessionCreate,
    DemoSessionResponse,
    NotificationResponse,
    OperatorTripCreate,
    SeatHoldCreate,
    SeatHoldResponse,
)
from .security import current_user_id
from .supabase_client import get_supabase


logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_: FastAPI):
    yield


settings = get_settings()
app = FastAPI(
    title="AddisGo API",
    version="0.1.0",
    description="Trusted booking API for AddisGo web and mobile clients.",
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Demo-User-Id", "X-Operator-Key"],
)


def require_operator_key(x_operator_key: Annotated[str | None, Header()] = None) -> None:
    if not settings.operator_access_key or x_operator_key != settings.operator_access_key:
        raise HTTPException(status_code=401, detail="Operator access is required.")


def ensure_stop_id(name: str, city: str) -> str:
    supabase = get_supabase()
    supabase.table("stops").upsert({"name": name, "city": city}, on_conflict="name,city").execute()
    stop = supabase.table("stops").select("id").eq("name", name).eq("city", city).maybe_single().execute().data
    if stop is None:
        raise HTTPException(status_code=500, detail="Could not prepare the route stop.")
    return stop["id"]


def create_booking_notifications(
    *,
    supabase: object,
    rider_id: str,
    booking_id: str,
    trip_id: str,
    booking_reference: str,
    seat_number: str,
) -> None:
    """Create rider and operator inbox records without blocking a valid booking."""
    try:
        supabase.table("notifications").insert([
            {
                "audience": "rider",
                "recipient_id": rider_id,
                "kind": "booking_confirmed",
                "title": "Booking confirmed",
                "body": f"Your AddisGo ticket {booking_reference} for seat {seat_number} is ready.",
                "booking_id": booking_id,
                "trip_id": trip_id,
            },
            {
                "audience": "operator",
                "kind": "new_booking",
                "title": "New confirmed booking",
                "body": f"Ticket {booking_reference} confirmed for seat {seat_number}.",
                "booking_id": booking_id,
                "trip_id": trip_id,
            },
        ]).execute()
    except Exception:
        # A booking remains valid if notifications have not been migrated yet.
        logger.warning("Booking %s was created but its notifications could not be saved.", booking_reference)


def rider_notifications(user_id: str) -> list[dict]:
    response = (
        get_supabase()
        .table("notifications")
        .select("id,audience,kind,title,body,booking_id,trip_id,read_at,created_at")
        .eq("audience", "rider")
        .eq("recipient_id", user_id)
        .order("created_at", desc=True)
        .limit(50)
        .execute()
    )
    return response.data


def mark_rider_notification_read(notification_id: str, user_id: str) -> dict:
    supabase = get_supabase()
    notification = (
        supabase.table("notifications")
        .select("id,audience,kind,title,body,booking_id,trip_id,read_at,created_at")
        .eq("id", notification_id)
        .eq("audience", "rider")
        .eq("recipient_id", user_id)
        .maybe_single()
        .execute()
        .data
    )
    if notification is None:
        raise HTTPException(status_code=404, detail="Notification not found.")
    if notification["read_at"] is not None:
        return notification
    updated = (
        supabase.table("notifications")
        .update({"read_at": datetime.now(timezone.utc).isoformat()})
        .eq("id", notification_id)
        .eq("audience", "rider")
        .eq("recipient_id", user_id)
        .execute()
        .data
    )
    return updated[0]


@app.get("/api/v1/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "addisgo-api"}


@app.get("/api/v1/trips")
def list_bookable_trips() -> list[dict]:
    """Public schedule endpoint with route and stop information for web and mobile."""
    response = (
        get_supabase()
        .table("trips")
        .select(
            "id,departure_at,arrival_at,fare_etb,coach_name,capacity,is_bookable,"
            "route:routes(service_type,public_code,operator_name,"
            "origin:origin_stop_id(name,city),destination:destination_stop_id(name,city))"
        )
        .eq("is_bookable", True)
        .order("departure_at")
        .execute()
    )
    return response.data


@app.get("/api/v1/operator/trips", dependencies=[Depends(require_operator_key)])
def list_operator_trips() -> list[dict]:
    """Protected live schedule for the operator portal."""
    response = (
        get_supabase()
        .table("trips")
        .select(
            "id,departure_at,arrival_at,fare_etb,coach_name,capacity,is_bookable,"
            "route:routes(service_type,public_code,operator_name,"
            "origin:origin_stop_id(name,city),destination:destination_stop_id(name,city)),"
            "bookings(status)"
        )
        .order("departure_at", desc=True)
        .limit(50)
        .execute()
    )
    return response.data


@app.get(
    "/api/v1/operator/notifications",
    response_model=list[NotificationResponse],
    dependencies=[Depends(require_operator_key)],
)
def list_operator_notifications() -> list[dict]:
    """Protected shared inbox for the operator portal."""
    response = (
        get_supabase()
        .table("notifications")
        .select("id,audience,kind,title,body,booking_id,trip_id,read_at,created_at")
        .eq("audience", "operator")
        .order("created_at", desc=True)
        .limit(50)
        .execute()
    )
    return response.data


@app.post(
    "/api/v1/operator/notifications/{notification_id}/read",
    response_model=NotificationResponse,
    dependencies=[Depends(require_operator_key)],
)
def mark_operator_notification_read(notification_id: str) -> dict:
    supabase = get_supabase()
    notification = (
        supabase.table("notifications")
        .select("id,audience,kind,title,body,booking_id,trip_id,read_at,created_at")
        .eq("id", notification_id)
        .eq("audience", "operator")
        .maybe_single()
        .execute()
        .data
    )
    if notification is None:
        raise HTTPException(status_code=404, detail="Notification not found.")
    if notification["read_at"] is not None:
        return notification
    updated = (
        supabase.table("notifications")
        .update({"read_at": datetime.now(timezone.utc).isoformat()})
        .eq("id", notification_id)
        .eq("audience", "operator")
        .execute()
        .data
    )
    return updated[0]


@app.post("/api/v1/operator/trips", status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_operator_key)])
def create_operator_trip(payload: OperatorTripCreate) -> dict:
    """Create a live trip after operator-key verification."""
    if payload.arrival_at <= payload.departure_at:
        raise HTTPException(status_code=422, detail="Arrival must be after departure.")
    if payload.origin.strip().casefold() == payload.destination.strip().casefold():
        raise HTTPException(status_code=422, detail="Origin and destination must be different.")
    supabase = get_supabase()
    origin_id = ensure_stop_id(payload.origin.strip(), payload.origin_city.strip())
    destination_id = ensure_stop_id(payload.destination.strip(), payload.destination_city.strip())
    route_code = payload.route_code.strip().upper()
    supabase.table("routes").upsert(
        {
            "service_type": payload.service_type,
            "public_code": route_code,
            "origin_stop_id": origin_id,
            "destination_stop_id": destination_id,
            "operator_name": payload.operator_name.strip(),
        },
        on_conflict="public_code",
    ).execute()
    route = supabase.table("routes").select("id").eq("public_code", route_code).maybe_single().execute().data
    if route is None:
        raise HTTPException(status_code=500, detail="Could not create the route.")
    return supabase.table("trips").insert(
        {
            "route_id": route["id"],
            "departure_at": payload.departure_at.isoformat(),
            "arrival_at": payload.arrival_at.isoformat(),
            "fare_etb": str(payload.fare_etb),
            "coach_name": payload.coach_name.strip(),
            "capacity": payload.capacity,
            "is_bookable": True,
        }
    ).execute().data[0]


@app.post("/api/v1/demo/session", response_model=DemoSessionResponse)
def create_demo_session(payload: DemoSessionCreate) -> DemoSessionResponse:
    """Temporary WhatsApp-demo login backed by a real Supabase user."""
    supabase = get_supabase()
    try:
        existing = supabase.table("profiles").select("id,phone").eq("phone", payload.phone).maybe_single().execute().data
        if existing:
            return DemoSessionResponse(user_id=existing["id"], phone=payload.phone)
        try:
            created = supabase.auth.admin.create_user({
                "phone": payload.phone,
                "phone_confirm": True,
                "user_metadata": {"full_name": "AddisGo Demo Rider"},
            })
            user_id = created.user.id
        except Exception:
            # A rider can already exist in auth.users when the profile trigger has not run.
            listed_users = supabase.auth.admin.list_users()
            users = getattr(listed_users, "users", listed_users)
            normalized_phone = payload.phone.lstrip("+")
            matching_user = next(
                (user for user in users if (user.phone or "").lstrip("+") == normalized_phone),
                None,
            )
            if matching_user is None:
                raise
            user_id = matching_user.id
        supabase.table("profiles").upsert({
            "id": user_id,
            "phone": payload.phone,
            "full_name": "AddisGo Demo Rider",
        }).execute()
        return DemoSessionResponse(user_id=user_id, phone=payload.phone)
    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail="Supabase sign-in is unavailable. Check SUPABASE_SERVICE_ROLE_KEY in apps/api/.env.",
        ) from exc


@app.get("/api/v1/demo/notifications", response_model=list[NotificationResponse])
def list_demo_notifications(x_demo_user_id: Annotated[str, Header()]) -> list[dict]:
    rider = get_supabase().table("profiles").select("id").eq("id", x_demo_user_id).maybe_single().execute().data
    if not rider:
        raise HTTPException(status_code=401, detail="Please sign in again.")
    return rider_notifications(x_demo_user_id)


@app.post("/api/v1/demo/notifications/{notification_id}/read", response_model=NotificationResponse)
def mark_demo_notification_read(notification_id: str, x_demo_user_id: Annotated[str, Header()]) -> dict:
    rider = get_supabase().table("profiles").select("id").eq("id", x_demo_user_id).maybe_single().execute().data
    if not rider:
        raise HTTPException(status_code=401, detail="Please sign in again.")
    return mark_rider_notification_read(notification_id, x_demo_user_id)


@app.post("/api/v1/demo/bookings", response_model=BookingResponse, status_code=status.HTTP_201_CREATED)
def create_demo_booking(payload: BookingCreate, x_demo_user_id: Annotated[str, Header()]) -> BookingResponse:
    """Temporary booking endpoint used until the real WhatsApp OTP provider is connected."""
    supabase = get_supabase()
    rider = supabase.table("profiles").select("id").eq("id", x_demo_user_id).maybe_single().execute().data
    if not rider:
        raise HTTPException(status_code=401, detail="Please sign in again.")
    trip = supabase.table("trips").select("id,fare_etb,is_bookable").eq("id", payload.trip_id).maybe_single().execute().data
    if trip is None or not trip["is_bookable"]:
        raise HTTPException(status_code=404, detail="This database trip is unavailable.")
    if payload.hold_token:
        hold = (
            supabase.table("seat_holds")
            .select("hold_token,expires_at")
            .eq("hold_token", payload.hold_token)
            .eq("trip_id", payload.trip_id)
            .eq("seat_number", payload.seat_number.upper())
            .eq("passenger_id", x_demo_user_id)
            .maybe_single()
            .execute()
            .data
        )
        if hold is None or datetime.fromisoformat(hold["expires_at"]).astimezone(timezone.utc) <= datetime.now(timezone.utc):
            raise HTTPException(status_code=409, detail="Your seat hold has expired. Please choose the seat again.")
    try:
        created = supabase.table("bookings").insert({
            "passenger_id": x_demo_user_id,
            "trip_id": payload.trip_id,
            "seat_number": payload.seat_number.upper(),
            "passenger_name": payload.passenger_name,
            "passenger_phone": payload.passenger_phone,
            "total_amount": trip["fare_etb"],
            "status": "confirmed",
        }).execute().data[0]
    except Exception as exc:
        raise HTTPException(status_code=409, detail="That seat is no longer available.") from exc
    if payload.hold_token:
        supabase.table("seat_holds").delete().eq("hold_token", payload.hold_token).execute()
    create_booking_notifications(
        supabase=supabase,
        rider_id=x_demo_user_id,
        booking_id=created["id"],
        trip_id=payload.trip_id,
        booking_reference=created["booking_reference"],
        seat_number=created["seat_number"],
    )
    return BookingResponse(id=created["id"], reference=created["booking_reference"], status=created["status"], total_amount=created["total_amount"])


@app.post("/api/v1/demo/seat-holds", response_model=SeatHoldResponse, status_code=status.HTTP_201_CREATED)
def create_demo_seat_hold(payload: SeatHoldCreate, x_demo_user_id: Annotated[str, Header()]) -> SeatHoldResponse:
    """Reserve a seat for five minutes while a demo rider completes payment."""
    supabase = get_supabase()
    rider = supabase.table("profiles").select("id").eq("id", x_demo_user_id).maybe_single().execute().data
    if not rider:
        raise HTTPException(status_code=401, detail="Please sign in again.")
    try:
        result = supabase.rpc(
            "hold_seat",
            {
                "p_trip_id": payload.trip_id,
                "p_seat_number": payload.seat_number,
                "p_passenger_id": x_demo_user_id,
            },
        ).execute().data
        hold = result[0] if isinstance(result, list) else result
        if not hold:
            raise ValueError("Seat hold was not created.")
        return SeatHoldResponse(**hold)
    except HTTPException:
        raise
    except Exception as exc:
        if "hold_seat" in str(exc):
            raise HTTPException(
                status_code=503,
                detail="Seat locking has not been activated yet. Apply the seat-holds migration first.",
            ) from exc
        raise HTTPException(status_code=409, detail="This seat is no longer available. Please choose another seat.") from exc


@app.delete("/api/v1/demo/seat-holds/{hold_token}", status_code=status.HTTP_204_NO_CONTENT)
def release_demo_seat_hold(hold_token: str, x_demo_user_id: Annotated[str, Header()]) -> None:
    get_supabase().table("seat_holds").delete().eq("hold_token", hold_token).eq("passenger_id", x_demo_user_id).execute()


@app.get("/api/v1/bookings/me")
def my_bookings(user_id: Annotated[str, Depends(current_user_id)]) -> list[dict]:
    response = (
        get_supabase()
        .table("bookings")
        .select("id,booking_reference,trip_id,seat_number,total_amount,status,created_at")
        .eq("passenger_id", user_id)
        .order("created_at", desc=True)
        .execute()
    )
    return response.data


@app.get("/api/v1/notifications", response_model=list[NotificationResponse])
def my_notifications(user_id: Annotated[str, Depends(current_user_id)]) -> list[dict]:
    return rider_notifications(user_id)


@app.post("/api/v1/notifications/{notification_id}/read", response_model=NotificationResponse)
def mark_my_notification_read(
    notification_id: str,
    user_id: Annotated[str, Depends(current_user_id)],
) -> dict:
    return mark_rider_notification_read(notification_id, user_id)


@app.post("/api/v1/bookings", response_model=BookingResponse, status_code=status.HTTP_201_CREATED)
def create_booking(
    payload: BookingCreate,
    user_id: Annotated[str, Depends(current_user_id)],
) -> BookingResponse:
    supabase = get_supabase()
    trip = (
        supabase.table("trips")
        .select("id,fare_etb,is_bookable")
        .eq("id", payload.trip_id)
        .maybe_single()
        .execute()
        .data
    )
    if trip is None or not trip["is_bookable"]:
        raise HTTPException(status_code=404, detail="This trip is unavailable.")

    try:
        created = (
            supabase.table("bookings")
            .insert({
                "passenger_id": user_id,
                "trip_id": payload.trip_id,
                "seat_number": payload.seat_number.upper(),
                "passenger_name": payload.passenger_name,
                "passenger_phone": payload.passenger_phone,
                "total_amount": trip["fare_etb"],
            })
            .execute()
            .data[0]
        )
    except Exception as exc:
        # The database unique constraint remains the final protection against double seats.
        raise HTTPException(status_code=409, detail="That seat is no longer available.") from exc

    create_booking_notifications(
        supabase=supabase,
        rider_id=user_id,
        booking_id=created["id"],
        trip_id=payload.trip_id,
        booking_reference=created["booking_reference"],
        seat_number=created["seat_number"],
    )

    return BookingResponse(
        id=created["id"],
        reference=created["booking_reference"],
        status=created["status"],
        total_amount=created["total_amount"],
    )
