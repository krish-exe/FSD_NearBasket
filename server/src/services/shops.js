import { geocodeExact, geocodePincode, straightLineKm } from "./geo.js";

// How far the street-level match may be from the pincode area before we distrust it
const MAX_STREET_OFFSET_KM = 5;

// Rules for a shop's details, used by Shop Settings and by shop sign-up
export function validateSettings(form) {
  const errors = {};
  const phoneDigits = form.phone.replace(/[\s-]/g, "").replace(/^\+91/, "");
  if (form.shopName.length < 2) errors.shopName = "Shop name must be at least 2 characters.";
  if (!/^\d{10}$/.test(phoneDigits)) errors.phone = "Enter a valid 10-digit phone number.";
  if (form.description.length > 200) errors.description = "Keep the description under 200 characters.";
  if (!form.street) errors.street = "Street address is required.";
  if (!form.city) errors.city = "City is required.";
  if (!/^\d{6}$/.test(form.pincode)) errors.pincode = "Enter a valid 6-digit pincode.";
  if (form.weekdayOpen >= form.weekdayClose) errors.weekdayHours = "Closing time must be after opening time.";
  if (form.sundayOpen >= form.sundayClose) errors.sundayHours = "Closing time must be after opening time.";
  return errors;
}

/**
 * The shop's map position as { lat, lng, label }, or null if the address can't be found.
 * The pincode is the anchor: the street address is used only when it lands within a
 * few km of the pincode's area (street names repeat across cities), otherwise the
 * centre of the pincode area is used.
 */
export async function locateShop({ street, city, pincode }) {
  const pinPoint = await geocodePincode(pincode);
  const streetPoint = await geocodeExact(`${street}, ${city}`);
  if (streetPoint && (!pinPoint || straightLineKm(streetPoint, pinPoint) <= MAX_STREET_OFFSET_KM)) return streetPoint;
  return pinPoint;
}
