from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field


class BookingCreate(BaseModel):
    trip_id: str
    seat_number: str = Field(min_length=1, max_length=8)
    passenger_name: str = Field(min_length=2, max_length=120)
    passenger_phone: str = Field(min_length=6, max_length=32)


class BookingResponse(BaseModel):
    id: str
    reference: str
    status: str
    total_amount: Decimal


class TripResponse(BaseModel):
    id: str
    departure_at: datetime
    arrival_at: datetime
    fare_etb: Decimal
    coach_name: str
    capacity: int
    is_bookable: bool
