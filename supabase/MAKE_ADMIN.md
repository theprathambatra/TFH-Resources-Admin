# Make Yana an admin

1. In Supabase open Authentication -> Users.
2. Create/add a user with Yana's email and a strong password.
3. Open SQL Editor -> New query.
4. Run this after replacing the email:

```sql
insert into public.admins (user_id, email)
select id, email
from auth.users
where lower(email) = lower('YANA_EMAIL_HERE')
on conflict (user_id)
do update set email = excluded.email;
```

5. Open http://localhost:3000/admin and sign in.
