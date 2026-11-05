from datetime import datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, Field


class BookingCreate(BaseModel):
    trip_id: str
    seat_number: str = Field(min_length=1, max_length=8)
    passenger_name: str = Field(min_length=2, max_length=120)
    passenger_phone: str = Field(min_length=6, max_length=32)
    hold_token: str | None = None


class BookingResponse(BaseModel):
    id: str
    reference: str
    status: str
    total_amount: Decimal


class NotificationResponse(BaseModel):
    id: str
    audience: Literal["rider", "operator"]
    kind: str
    title: str
    body: str
    booking_id: str | None = None
    trip_id: str | None = None
    read_at: datetime | None = None
    created_at: datetime


class SeatHoldCreate(BaseModel):
    trip_id: str
    seat_number: str = Field(min_length=1, max_length=8)


class SeatHoldResponse(BaseModel):
    hold_token: str
    expires_at: datetime


class OperatorTripCreate(BaseModel):
    route_code: str = Field(min_length=2, max_length=32)
    service_type: Literal["city", "intercity"]
    origin: str = Field(min_length=2, max_length=120)
    origin_city: str = Field(min_length=2, max_length=120)
    destination: str = Field(min_length=2, max_length=120)
    destination_city: str = Field(min_length=2, max_length=120)
    operator_name: str = Field(min_length=2, max_length=120)
    coach_name: str = Field(min_length=2, max_length=120)
    departure_at: datetime
    arrival_at: datetime
    fare_etb: Decimal = Field(gt=0)
    capacity: int = Field(gt=0, le=100)


class DemoSessionCreate(BaseModel):
    phone: str = Field(pattern=r"^\+251\d{9}$")


class DemoSessionResponse(BaseModel):
    user_id: str
    phone: str


class TripResponse(BaseModel):
    id: str
    departure_at: datetime
    arrival_at: datetime
    fare_etb: Decimal
    coach_name: str
    capacity: int
    is_bookable: bool
