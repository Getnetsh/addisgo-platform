from contextlib import asynccontextmanager
from typing import Annotated

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .schemas import BookingCreate, BookingResponse
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
    allow_headers=["Authorization", "Content-Type"],
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
