import { NextResponse } from "next/server";

const LIFEOS_VAPID_PUBLIC_KEY = "BDlPcjrEN5NdTh8XUSRBRE8DHyk1GanYDgBgHClPudvrJE28PjSwnrzGts8LM0LM9OPtuOu0blbP18nClx87Mfc";

export async function GET() {
  const key = process.env.VAPID_PUBLIC_KEY || LIFEOS_VAPID_PUBLIC_KEY;
  return NextResponse.json({ configured: true, publicKey: key });
}
