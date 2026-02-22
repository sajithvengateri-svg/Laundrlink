// ─── User Roles ───────────────────────────────────────────────────────────────
export const ROLES = {
  CUSTOMER: 'customer',
  HUB: 'hub',
  PRO: 'pro',
  DRIVER: 'driver',
  ADMIN: 'admin',
} as const

export type Role = (typeof ROLES)[keyof typeof ROLES]

// ─── Order Statuses ───────────────────────────────────────────────────────────
export const ORDER_STATUS = {
  PENDING: 'pending',
  PICKUP_SCHEDULED: 'pickup_scheduled',
  PICKED_UP_BY_DRIVER: 'picked_up_by_driver',
  AT_HUB: 'at_hub',
  ASSIGNED_TO_PRO: 'assigned_to_pro',
  WITH_PRO: 'with_pro',
  RETURNED_TO_HUB: 'returned_to_hub',
  OUT_FOR_DELIVERY: 'out_for_delivery',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
} as const

export type OrderStatus = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS]

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Order Placed',
  pickup_scheduled: 'Pickup Scheduled',
  picked_up_by_driver: 'Picked Up',
  at_hub: 'At Hub',
  assigned_to_pro: 'Assigned to Pro',
  with_pro: 'Being Washed',
  returned_to_hub: 'Ready for Dispatch',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
}

// ─── Bag Statuses ─────────────────────────────────────────────────────────────
export const BAG_STATUS = {
  UNASSIGNED: 'unassigned',
  IN_TRANSIT_TO_HUB: 'in_transit_to_hub',
  AT_HUB: 'at_hub',
  WITH_PRO: 'with_pro',
  IN_TRANSIT_TO_CUSTOMER: 'in_transit_to_customer',
  DELIVERED: 'delivered',
} as const

export type BagStatus = (typeof BAG_STATUS)[keyof typeof BAG_STATUS]

// ─── Handoff Steps ────────────────────────────────────────────────────────────
export const HANDOFF_STEP = {
  CUSTOMER_TO_DRIVER: 'customer_to_driver',
  DRIVER_TO_HUB: 'driver_to_hub',
  HUB_TO_PRO: 'hub_to_pro',
  PRO_TO_HUB: 'pro_to_hub',
  HUB_TO_DRIVER: 'hub_to_driver',
  DRIVER_TO_CUSTOMER: 'driver_to_customer',
} as const

export type HandoffStep = (typeof HANDOFF_STEP)[keyof typeof HANDOFF_STEP]

// ─── Service Types ────────────────────────────────────────────────────────────
export const SERVICE_TYPE = {
  WASH_FOLD: 'wash_fold',
  DRY_CLEAN: 'dry_clean',
  IRON: 'iron',
  SPECIALIST: 'specialist',
} as const

export type ServiceType = (typeof SERVICE_TYPE)[keyof typeof SERVICE_TYPE]

// ─── Pro Tiers ────────────────────────────────────────────────────────────────
export const PRO_TIER = {
  ROOKIE: 'rookie',
  ELITE: 'elite',
  LEGENDARY: 'legendary',
} as const

export const PRO_TIER_REQUIREMENTS = {
  rookie: { minOrders: 0, minRating: 0 },
  elite: { minOrders: 25, minRating: 4.5 },
  legendary: { minOrders: 100, minRating: 4.8 },
}

export const PRO_TIER_BONUS = {
  rookie: 0,
  elite: 5,      // +5% earnings
  legendary: 10, // +10% earnings
}

// ─── Loyalty ──────────────────────────────────────────────────────────────────
export const LOYALTY_TIER = {
  BRONZE: 'bronze',
  SILVER: 'silver',
  GOLD: 'gold',
} as const

export const LOYALTY_TIER_THRESHOLDS = {
  bronze: 0,
  silver: 200,
  gold: 500,
}

export const POINTS_PER_DOLLAR = 10
export const POINTS_REDEEM_RATE = 100 // 100 points = $1

// ─── Pricing (defaults, cents) ────────────────────────────────────────────────
export const DEFAULT_PRICING = {
  individualBag: 4500,
  familyBag: 7900,
  expressSurcharge: 2000,
  ironingAddon: 1500,
  pickupFee: 800,
  deliveryFee: 800,
  driverFeeBase: 500,
  driverFeePerKm: 100,
  minOrder: 4500,
  hubSharePercent: 70,
  platformSharePercent: 30,
} as const

// ─── Brand Colors ─────────────────────────────────────────────────────────────
export const BRAND = {
  blue: '#007AFF',
  teal: '#00C7BE',
  amber: '#FF9500',
  danger: '#FF3B30',
  bgLight: '#F2F2F7',
  cardBg: '#FFFFFF',
  textPrimary: '#1C1C1E',
  textSecondary: '#8E8E93',
} as const

// ─── Map ──────────────────────────────────────────────────────────────────────
export const DEFAULT_MAP_CENTER = { lat: -33.8688, lng: 151.2093 } // Sydney
export const HUB_SEARCH_RADIUS_KM = 15
export const PRO_SEARCH_RADIUS_KM = 10

// ─── App ──────────────────────────────────────────────────────────────────────
export const APP_NAME = 'LaundrLink'
export const APP_TAGLINE = 'The Logistics Protocol for Clean.'
export const LOST_BAG_THRESHOLD_HOURS = 48
export const DRIVER_AUTO_DISPATCH_TIMEOUT_MINUTES = 10

// ─── NDIS ─────────────────────────────────────────────────────────────────────
export const NDIS_SUPPORT_ITEM_CODE = '01_020_0120_1_1'
export const NDIS_SUPPORT_ITEM_LABEL = 'Household Tasks — Laundry'
export const GST_RATE = 0.1
