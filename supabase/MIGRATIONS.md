# Menius — Migration Order

Apply migrations to a fresh Supabase project **in the order listed below**.
All files are in the `supabase/` directory. Run each via the Supabase SQL editor
or `psql` connected to the project.

> **Rule for new migrations**: always append to this list. Never reorder or delete
> existing entries. Name new files `migration-<feature>.sql`.

---

## Apply Order

```
1.  migration.sql                       ← baseline schema (tables, RLS, functions)
2.  migration-subscriptions.sql
3.  migration-payments.sql
4.  migration-stripe-connect.sql
5.  migration-restaurant-settings.sql
6.  migration-locale-ordertype-payments.sql
7.  migration-modifier-groups.sql
8.  migration-modifier-display-type.sql
9.  migration-reviews.sql
10. migration-promotions.sql
11. migration-customers.sql
12. migration-customer-phone.sql
13. migration-loyalty.sql
14. migration-loyalty-orders.sql
15. migration-notifications.sql
16. migration-order-notification-log.sql
17. migration-orders-counter.sql
18. migration-order-security.sql
19. migration-order-tracking-items.sql
20. migration-webhook-idempotency.sql
21. migration-tip-delivery.sql
22. migration-payment-breakdown.sql
23. migration-tax.sql
24. migration-table-name-orders.sql
25. migration-scheduled-orders.sql
26. migration-pause-orders.sql
27. migration-staff.sql
28. migration-api-keys.sql
29. migration-audit-log.sql
30. migration-security-fixes.sql
31. migration-security-performance.sql
32. migration-drivers.sql
33. migration-driver-status-timestamps.sql
34. migration-driver-token-expiry.sql
35. migration-driver-gps.sql
36. migration-delivery-photo.sql
37. migration-push-subscriptions.sql
38. migration-reservations.sql
39. migration-inventory.sql
40. migration-prep-time.sql
41. migration-campaigns.sql
42. migration-custom-domain.sql
43. migration-multi-location.sql
44. migration-kds-stations.sql
45. migration-shifts.sql
46. migration-suggestions.sql
47. migration-chat-memory.sql
48. migration-menius-posts.sql
49. migration-cfdi.sql
50. migration-style-anchors.sql
51. migration-ai-enhance-logs.sql
52. migration-atomic-restaurant.sql
53. migration-buccaneer-categories.sql
54. migration-fix-subscriptions.sql
55. migration-fix-qr-urls.sql
56. migration-utensils.sql
```

---

## Diagnostic / Seed files (do NOT apply in production)

```
diagnostic-rls.sql          — RLS diagnostic queries only, read-only
fix-trigger-urgent.sql      — one-time trigger fix, check if still needed
seed-demo-restaurant.sql    — inserts demo restaurant data (dev/staging only)
seed-buccaneer.sql          — inserts Buccaneer test restaurant
seed-buccaneer-images.sql   — updates image URLs for Buccaneer restaurant
```

---

## Notes

- `migration.sql` must always be applied first — it creates all base tables.
- Migrations are idempotent where possible (`CREATE TABLE IF NOT EXISTS`,
  `ADD COLUMN IF NOT EXISTS`). Running the same file twice should be safe.
- If a migration fails mid-way, check for partial state before retrying.
- Never modify an already-applied migration file. Create a new one instead.
