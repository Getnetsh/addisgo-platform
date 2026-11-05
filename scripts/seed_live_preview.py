"""Create current AddisGo preview schedules in the configured Supabase project.

This script is idempotent: rerunning it does not duplicate a route or departure.
It does not remove existing operator data, bookings, or riders.
"""

from datetime import datetime, time, timedelta
from pathlib import Path
import sys
from zoneinfo import ZoneInfo


PROJECT_ROOT = Path(__file__).resolve().parents[1]
API_DIRECTORY = PROJECT_ROOT / "apps" / "api"
sys.path.insert(0, str(API_DIRECTORY))

from app.supabase_client import get_supabase  # noqa: E402


TIMEZONE = ZoneInfo("Africa/Addis_Ababa")
STOPS = [
    ("Megenagna", "Addis Ababa"),
    ("Mexico Square", "Addis Ababa"),
    ("Piassa", "Addis Ababa"),
    ("Bole", "Addis Ababa"),
    ("Lideta", "Addis Ababa"),
    ("Addis Ababa", "Addis Ababa"),
    ("Hawassa", "Hawassa"),
    ("Bahir Dar", "Bahir Dar"),
]
ROUTES = [
    ("CITY-101", "city", "Megenagna", "Mexico Square", "Sheger City Bus"),
    ("CITY-074", "city", "Piassa", "Bole", "Anbessa City Bus"),
    ("CITY-022", "city", "Mexico Square", "Lideta", "Sheger City Bus"),
    ("CITY-016", "city", "Bole", "Megenagna", "Anbessa City Bus"),
    ("ADD-AWA", "intercity", "Addis Ababa", "Hawassa", "Selam Bus"),
    ("ADD-BJR", "intercity", "Addis Ababa", "Bahir Dar", "Sky Bus"),
]
SCHEDULES = [
    ("CITY-101", "Sheger City 101", time(8, 10), 32, 12, 32),
    ("CITY-101", "Sheger City 101", time(13, 15), 28, 12, 32),
    ("CITY-074", "Anbessa City 74", time(8, 25), 40, 10, 28),
    ("CITY-016", "Anbessa City 16", time(18, 10), 35, 10, 24),
    ("CITY-022", "Sheger City 22", time(14, 20), 30, 12, 28),
    ("ADD-AWA", "Selam Hawassa Express", time(6, 30), 330, 650, 49),
    ("ADD-BJR", "Sky Bahir Dar Express", time(7, 0), 540, 900, 49),
]


def main() -> None:
    client = get_supabase()
    client.table("stops").upsert(
        [{"name": name, "city": city} for name, city in STOPS],
        on_conflict="name,city",
    ).execute()

    stop_rows = client.table("stops").select("id,name,city").execute().data
    stop_ids = {(row["name"], row["city"]): row["id"] for row in stop_rows}
    client.table("routes").upsert(
        [
            {
                "service_type": service_type,
                "public_code": code,
                "origin_stop_id": stop_ids[(origin, "Addis Ababa" if origin not in {"Hawassa", "Bahir Dar"} else origin)],
                "destination_stop_id": stop_ids[(destination, "Addis Ababa" if destination not in {"Hawassa", "Bahir Dar"} else destination)],
                "operator_name": operator_name,
            }
            for code, service_type, origin, destination, operator_name in ROUTES
        ],
        on_conflict="public_code",
    ).execute()

    route_rows = (
        client.table("routes")
        .select("id,public_code")
        .in_("public_code", [code for code, *_ in ROUTES])
        .execute()
        .data
    )
    route_ids = {row["public_code"]: row["id"] for row in route_rows}
    today = datetime.now(TIMEZONE).date()
    start = datetime.combine(today, time.min, TIMEZONE)
    end = start + timedelta(days=2)
    existing_rows = (
        client.table("trips")
        .select("route_id,departure_at")
        .in_("route_id", list(route_ids.values()))
        .gte("departure_at", start.isoformat())
        .lt("departure_at", end.isoformat())
        .execute()
        .data
    )
    existing = {
        (
            row["route_id"],
            datetime.fromisoformat(row["departure_at"]).astimezone(TIMEZONE).isoformat(),
        )
        for row in existing_rows
    }
    new_trips = []
    for day_offset in range(2):
        travel_date = today + timedelta(days=day_offset)
        for code, coach, departure_time, duration, fare, capacity in SCHEDULES:
            departure = datetime.combine(travel_date, departure_time, TIMEZONE)
            route_id = route_ids[code]
            if (route_id, departure.isoformat()) not in existing:
                new_trips.append(
                    {
                        "route_id": route_id,
                        "departure_at": departure.isoformat(),
                        "arrival_at": (departure + timedelta(minutes=duration)).isoformat(),
                        "fare_etb": fare,
                        "coach_name": coach,
                        "capacity": capacity,
                        "is_bookable": True,
                    }
                )

    if new_trips:
        client.table("trips").insert(new_trips).execute()
    print(f"Supabase preview schedules ready. Created {len(new_trips)} departures.")


if __name__ == "__main__":
    main()
