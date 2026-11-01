from contextlib import asynccontextmanager
from typing import Annotated

from fastapi import Depends, FastAPI, Header, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .schemas import BookingCreate, BookingResponse, DemoSessionCreate, DemoSessionResponse
from .security import current_user_id
from .supabase_client import get_supabase


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
    allow_headers=["Authorization", "Content-Type", "X-Demo-User-Id"],
)


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
    return BookingResponse(id=created["id"], reference=created["booking_reference"], status=created["status"], total_amount=created["total_amount"])


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

    return BookingResponse(
        id=created["id"],
        reference=created["booking_reference"],
        status=created["status"],
        total_amount=created["total_amount"],
    )
