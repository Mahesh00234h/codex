/**
 * Geographic utility functions for distance and ETA calculations
 */

// Convert degrees to radians
function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Calculate distance between two points using Haversine formula
 * @returns Distance in kilometers
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculate estimated time of arrival
 * @param distanceKm - Distance in kilometers
 * @param speedKmh - Speed in km/h (defaults to 25 km/h for urban delivery)
 * @returns Object with ETA details
 */
export function calculateETA(
  distanceKm: number,
  speedKmh: number = 25 // Average urban delivery speed
): {
  minutes: number;
  formattedTime: string;
  arrivalTime: Date;
} {
  // Minimum speed to prevent division by zero
  const effectiveSpeed = Math.max(speedKmh, 5);
  
  // Calculate time in hours, then convert to minutes
  const timeHours = distanceKm / effectiveSpeed;
  const minutes = Math.round(timeHours * 60);
  
  // Add buffer for traffic, stops, etc. (20% buffer, minimum 2 minutes)
  const bufferedMinutes = Math.max(Math.round(minutes * 1.2), 2);
  
  // Format the time string
  let formattedTime: string;
  if (bufferedMinutes < 1) {
    formattedTime = 'Less than a minute';
  } else if (bufferedMinutes === 1) {
    formattedTime = '1 minute';
  } else if (bufferedMinutes < 60) {
    formattedTime = `${bufferedMinutes} minutes`;
  } else {
    const hours = Math.floor(bufferedMinutes / 60);
    const mins = bufferedMinutes % 60;
    if (mins === 0) {
      formattedTime = hours === 1 ? '1 hour' : `${hours} hours`;
    } else {
      formattedTime = `${hours}h ${mins}m`;
    }
  }
  
  // Calculate arrival time
  const arrivalTime = new Date();
  arrivalTime.setMinutes(arrivalTime.getMinutes() + bufferedMinutes);
  
  return {
    minutes: bufferedMinutes,
    formattedTime,
    arrivalTime,
  };
}

/**
 * Get delivery ETA from current location to destination
 * @param currentLat - Current latitude
 * @param currentLon - Current longitude
 * @param destLat - Destination latitude
 * @param destLon - Destination longitude
 * @param currentSpeedMs - Current speed in m/s (from geolocation API)
 */
export function getDeliveryETA(
  currentLat: number,
  currentLon: number,
  destLat: number,
  destLon: number,
  currentSpeedMs?: number | null
): {
  distanceKm: number;
  distanceFormatted: string;
  eta: ReturnType<typeof calculateETA>;
} {
  const distanceKm = calculateDistance(currentLat, currentLon, destLat, destLon);
  
  // Convert m/s to km/h if speed is available, otherwise use default
  // Geolocation API returns speed in m/s
  let speedKmh = 25; // Default urban delivery speed
  if (currentSpeedMs && currentSpeedMs > 0) {
    speedKmh = currentSpeedMs * 3.6; // Convert m/s to km/h
  }
  
  // Format distance
  let distanceFormatted: string;
  if (distanceKm < 1) {
    distanceFormatted = `${Math.round(distanceKm * 1000)} m`;
  } else {
    distanceFormatted = `${distanceKm.toFixed(1)} km`;
  }
  
  return {
    distanceKm,
    distanceFormatted,
    eta: calculateETA(distanceKm, speedKmh),
  };
}
