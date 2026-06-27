/**
 * GET /api/driver/orders
 * Devuelve las órdenes activas asignadas al driver autenticado.
 * "Activas" = status no es 'delivered' ni 'cancelled'.
 */
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClientFromToken, createClient } from "@/lib/supabase/server";
import { getDriverAuthUser } from "@/lib/auth/driver-auth";
import { createLogger } from "@/lib/logger";
import { captureError } from "@/lib/error-reporting";

const logger = createLogger("api/driver/orders");

export async function GET(req: NextRequest) {
  // Autenticar vía JWT (header Bearer en la app, cookie en web)
  const user = await getDriverAuthUser(req);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Construir cliente autenticado con el JWT del driver (respeta RLS)
  const authHeader =
    req.headers.get("authorization") ?? req.headers.get("Authorization");
  const bearer = authHeader?.toLowerCase().startsWith("bearer ")
    ? authHeader.slice(7).trim()
    : null;
  const supabase = bearer
    ? createClientFromToken(bearer)
    : await createClient();

  // Resolver driverId desde auth_user_id
  const { data: driver, error: driverError } = await supabase
    .from("drivers")
    .select("id, is_active")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (driverError) {
    logger.error("Error al resolver driver", {
      userId: user.id,
      message: driverError.message,
    });
    captureError(driverError, {
      route: "GET /api/driver/orders",
      userId: user.id,
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }

  if (!driver) {
    return NextResponse.json({ error: "Driver not found" }, { status: 404 });
  }

  if (!driver.is_active) {
    return NextResponse.json(
      { error: "Driver account is inactive" },
      { status: 403 },
    );
  }

  // Órdenes asignadas al driver que aún no están terminadas
  const { data: orders, error: ordersError } = await supabase
    .from("orders")
    .select(
      "id, order_number, delivery_address, customer_name, customer_phone, status, driver_tracking_token, restaurants(name)",
    )
    .eq("driver_id", driver.id)
    .not("status", "in", '("delivered","cancelled")')
    .order("created_at", { ascending: false });

  if (ordersError) {
    logger.error("Error al obtener órdenes del driver", {
      driverId: driver.id,
      message: ordersError.message,
    });
    captureError(ordersError, {
      route: "GET /api/driver/orders",
      userId: user.id,
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }

  const result = (orders ?? []).map((o) => ({
    orderId: o.id,
    orderNumber: o.order_number,
    deliveryAddress: o.delivery_address ?? null,
    customerName: o.customer_name ?? null,
    customerPhone: o.customer_phone ?? null,
    status: o.status,
    driverTrackingToken: o.driver_tracking_token ?? null,
    restaurantName:
      (o as unknown as { restaurants: { name: string } | null }).restaurants
        ?.name ?? null,
  }));

  return NextResponse.json({ orders: result });
}
