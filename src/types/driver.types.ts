import type { Database } from './database.types'

export type Driver = Database['public']['Tables']['drivers']['Row']
export type DriverInsert = Database['public']['Tables']['drivers']['Insert']
export type DriverUpdate = Database['public']['Tables']['drivers']['Update']
export type DispatchJob = Database['public']['Tables']['dispatch_jobs']['Row']
export type DispatchJobInsert = Database['public']['Tables']['dispatch_jobs']['Insert']
export type DispatchProvider = Database['public']['Enums']['dispatch_provider']

// Valid dispatch job statuses (string enum — kept loose in DB for forward-compat)
export type DispatchJobStatus =
  | 'pending'
  | 'accepted'
  | 'en_route_to_pickup'
  | 'picked_up'
  | 'en_route_to_customer'
  | 'delivered'
  | 'cancelled'
  | 'failed'

// Step machine for the driver's active delivery run
export type RunStep =
  | 'navigate_to_pickup'    // Driver navigating to hub
  | 'scan_pickup'           // QR scan at hub (hub_to_driver handoff)
  | 'photo_pickup'          // Photo of bag at hub
  | 'confirmed_pickup'      // Brief confirmation before driving
  | 'navigate_to_dropoff'   // Driver navigating to customer
  | 'scan_delivery'         // QR scan at customer (driver_to_customer handoff)
  | 'photo_delivery'        // Photo at customer door
  | 'signature'             // Customer digital signature
  | 'complete'              // Run complete

export interface DriverMetrics {
  runsToday: number
  earningsToday: number     // cents
  earningsThisWeek: number  // cents
  ratingAvg: number
  totalRuns: number
}

export interface DispatchJobWithOrder extends DispatchJob {
  order?: {
    id: string
    order_number: string
    status: string
    hub_id: string | null
    pickup_address: Record<string, unknown> | null
    delivery_address: Record<string, unknown> | null
    customer?: {
      id: string
      full_name: string | null
      phone: string | null
    } | null
    hub?: {
      id: string
      business_name: string
      address: Record<string, unknown> | null
    } | null
    bags?: Array<{ id: string; qr_code: string; current_status: string | null }>
  } | null
}

// Params for calling the dispatch-driver edge function
export interface DispatchOrderParams {
  orderId: string
  pickupLat: number
  pickupLng: number
  dropoffLat: number
  dropoffLng: number
}

export interface DispatchOrderResult {
  dispatch_provider: DispatchProvider
  dispatch_job_id: string
  driver_id: string | null
  external_job_id: string | null
  estimated_eta: string | null
}

// Token payload for the public web QR scan page (third-party drivers)
export interface WebScanToken {
  orderId: string
  step: string
  fromUserId: string
  toUserId: string
  bagId: string
  expires: number  // Unix timestamp ms
}
