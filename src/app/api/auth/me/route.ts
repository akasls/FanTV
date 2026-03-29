import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  let setting = await prisma.systemSetting.findUnique({
    where: { id: "global" },
  });
  if (!setting)
    setting = await prisma.systemSetting.create({
      data: {
        id: "global",
        allowRegistration: false,
        allowGuestAccess: false,
        siteName: "FanTv",
        siteDescription: "A modern dual-mode video application.",
        siteLogo: "",
        speedTestPlayback: true,
      },
    });
  const configPayload = {
    allowGuestAccess: setting.allowGuestAccess,
    siteName: setting.siteName,
    siteDescription: setting.siteDescription,
    siteLogo: setting.siteLogo,
    speedTestPlayback: (setting as any).speedTestPlayback,
    removeTsAd: (setting as any).removeTsAd,
    shortDramaApiUrl: (setting as any).shortDramaApiUrl,
    shortDramaCategories: (setting as any).shortDramaCategories,
    doubanDataProxy: (setting as any).doubanDataProxy,
    doubanImageProxy: (setting as any).doubanImageProxy,
  };

  const token = req.cookies.get("fantv_token")?.value;
  if (!token) return NextResponse.json({ user: null, config: configPayload });

  const payload = await verifyToken(token);
  if (!payload || !payload.id)
    return NextResponse.json({ user: null, config: configPayload });

  const user = await prisma.user.findUnique({
    where: { id: payload.id as string },
  });

  if (!user || !user.isActive || user.sessionId !== payload.sessionId)
    return NextResponse.json({ user: null, config: configPayload });

  return NextResponse.json({
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      allowAdultMode: user.allowAdultMode,
      sourceOrder: user.sourceOrder,
      doubanDataProxy: (user as any).doubanDataProxy,
      doubanImageProxy: (user as any).doubanImageProxy,
      speedTestPlayback: (user as any).speedTestPlayback,
    },
    config: configPayload,
  });
}
