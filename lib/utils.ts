import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(date))
}

export function formatDateTime(date: Date | string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
  }).format(new Date(date))
}

export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w ]+/g, '')
    .replace(/ +/g, '-')
}

export function calculateDeliveryFee(
  distance: number,
  baseDeliveryFee: number = 2.99
): number {
  // Base fee + $1 per mile
  return baseDeliveryFee + Math.floor(distance)
}

export function isWithinDeliveryRadius(
  restaurantLat: number,
  restaurantLng: number,
  customerLat: number,
  customerLng: number,
  radiusMiles: number
): boolean {
  const distance = calculateDistance(
    restaurantLat,
    restaurantLng,
    customerLat,
    customerLng
  )
  return distance <= radiusMiles
}

export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  // Haversine formula
  const R = 3959 // Radius of Earth in miles
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180)
}

export function calculateTax(subtotal: number, taxRate: number = 0.0825): number {
  // Default 8.25% (Texas rate as example)
  return subtotal * taxRate
}

export function calculateOrderTotal(
  subtotal: number,
  deliveryFee: number = 0,
  tip: number = 0,
  discount: number = 0,
  taxRate: number = 0.0825
): number {
  const tax = calculateTax(subtotal, taxRate)
  return subtotal + tax + deliveryFee + tip - discount
}
