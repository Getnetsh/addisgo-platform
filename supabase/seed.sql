-- Demo routes for the first local preview. Replace with validated operator schedules before launch.
insert into public.stops (name, city) values
  ('Megenagna', 'Addis Ababa'), ('Mexico Square', 'Addis Ababa'),
  ('Addis Ababa Bus Terminal', 'Addis Ababa'), ('Bahir Dar Bus Station', 'Bahir Dar')
on conflict (name, city) do nothing;

insert into public.routes (service_type, public_code, origin_stop_id, destination_stop_id, operator_name)
select 'city', '101', origin_stop.id, destination_stop.id, 'Sheger City Bus'
from public.stops origin_stop, public.stops destination_stop
where origin_stop.name = 'Megenagna' and destination_stop.name = 'Mexico Square'
on conflict (public_code) do nothing;

insert into public.routes (service_type, public_code, origin_stop_id, destination_stop_id, operator_name)
select 'intercity', 'ADD-BJR-01', origin_stop.id, destination_stop.id, 'Selam Bus'
from public.stops origin_stop, public.stops destination_stop
where origin_stop.name = 'Addis Ababa Bus Terminal' and destination_stop.name = 'Bahir Dar Bus Station'
on conflict (public_code) do nothing;
