UPDATE resiro.users SET profile=profile||'{"accept_bookings":true,"is_demo":true}'::jsonb WHERE email='info@millenniumroofing.co.za';
