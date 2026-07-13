"use client";

import { useEffect, useState } from "react";
import { buildTravelContext, type GeoPosition, type TravelContext } from "@/lib/trip-context";

export function useTripContext() {
  const [position, setPosition] = useState<GeoPosition | undefined>();
  const [permission, setPermission] = useState<TravelContext["locationPermission"]>("idle");
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!("geolocation" in navigator)) {
      setPermission("unavailable");
      return;
    }

    const watcher = navigator.geolocation.watchPosition(
      (result) => {
        setPermission("granted");
        setPosition({
          latitude: result.coords.latitude,
          longitude: result.coords.longitude,
          accuracy: result.coords.accuracy
        });
      },
      () => setPermission("denied"),
      { enableHighAccuracy: true, maximumAge: 60000, timeout: 8000 }
    );

    return () => navigator.geolocation.clearWatch(watcher);
  }, []);

  return buildTravelContext(now, position, permission);
}
