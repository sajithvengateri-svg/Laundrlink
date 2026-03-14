export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      admin_users: {
        Row: {
          admin_role: string | null
          created_at: string | null
          id: string
        }
        Insert: {
          admin_role?: string | null
          created_at?: string | null
          id: string
        }
        Update: {
          admin_role?: string | null
          created_at?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_users_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bags: {
        Row: {
          created_at: string | null
          current_holder_id: string | null
          current_order_id: string | null
          current_status: Database["public"]["Enums"]["bag_status"] | null
          id: string
          qr_code: string
        }
        Insert: {
          created_at?: string | null
          current_holder_id?: string | null
          current_order_id?: string | null
          current_status?: Database["public"]["Enums"]["bag_status"] | null
          id?: string
          qr_code: string
        }
        Update: {
          created_at?: string | null
          current_holder_id?: string | null
          current_order_id?: string | null
          current_status?: Database["public"]["Enums"]["bag_status"] | null
          id?: string
          qr_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "bags_current_holder_id_fkey"
            columns: ["current_holder_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bags_current_order_fk"
            columns: ["current_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      dispatch_jobs: {
        Row: {
          completed_at: string | null
          cost_cents: number | null
          created_at: string | null
          driver_id: string | null
          dropoff_address: Json | null
          estimated_eta: string | null
          external_job_id: string | null
          id: string
          order_id: string
          pickup_address: Json | null
          provider: Database["public"]["Enums"]["dispatch_provider"]
          status: string | null
        }
        Insert: {
          completed_at?: string | null
          cost_cents?: number | null
          created_at?: string | null
          driver_id?: string | null
          dropoff_address?: Json | null
          estimated_eta?: string | null
          external_job_id?: string | null
          id?: string
          order_id: string
          pickup_address?: Json | null
          provider?: Database["public"]["Enums"]["dispatch_provider"]
          status?: string | null
        }
        Update: {
          completed_at?: string | null
          cost_cents?: number | null
          created_at?: string | null
          driver_id?: string | null
          dropoff_address?: Json | null
          estimated_eta?: string | null
          external_job_id?: string | null
          id?: string
          order_id?: string
          pickup_address?: Json | null
          provider?: Database["public"]["Enums"]["dispatch_provider"]
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dispatch_jobs_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispatch_jobs_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      disputes: {
        Row: {
          created_at: string | null
          evidence_photos: string[] | null
          id: string
          order_id: string
          reason: string
          refund_amount_cents: number | null
          reported_by: string
          reported_entity_id: string | null
          reported_entity_type: string | null
          resolution: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          evidence_photos?: string[] | null
          id?: string
          order_id: string
          reason: string
          refund_amount_cents?: number | null
          reported_by: string
          reported_entity_id?: string | null
          reported_entity_type?: string | null
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          evidence_photos?: string[] | null
          id?: string
          order_id?: string
          reason?: string
          refund_amount_cents?: number | null
          reported_by?: string
          reported_entity_id?: string | null
          reported_entity_type?: string | null
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "disputes_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_reported_by_fkey"
            columns: ["reported_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      drivers: {
        Row: {
          abn: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          is_available: boolean | null
          is_verified: boolean | null
          licence_photo_url: string | null
          location: unknown
          police_check_status:
            | Database["public"]["Enums"]["fit2work_status"]
            | null
          rating_avg: number | null
          rating_count: number | null
          stripe_connect_id: string | null
          stripe_onboarding_complete: boolean | null
          total_runs: number | null
          updated_at: string | null
          vehicle_type: string | null
        }
        Insert: {
          abn?: string | null
          created_at?: string | null
          id: string
          is_active?: boolean | null
          is_available?: boolean | null
          is_verified?: boolean | null
          licence_photo_url?: string | null
          location?: unknown
          police_check_status?:
            | Database["public"]["Enums"]["fit2work_status"]
            | null
          rating_avg?: number | null
          rating_count?: number | null
          stripe_connect_id?: string | null
          stripe_onboarding_complete?: boolean | null
          total_runs?: number | null
          updated_at?: string | null
          vehicle_type?: string | null
        }
        Update: {
          abn?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_available?: boolean | null
          is_verified?: boolean | null
          licence_photo_url?: string | null
          location?: unknown
          police_check_status?:
            | Database["public"]["Enums"]["fit2work_status"]
            | null
          rating_avg?: number | null
          rating_count?: number | null
          stripe_connect_id?: string | null
          stripe_onboarding_complete?: boolean | null
          total_runs?: number | null
          updated_at?: string | null
          vehicle_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "drivers_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      handoffs: {
        Row: {
          bag_id: string
          created_at: string | null
          from_user_id: string | null
          id: string
          location_lat: number | null
          location_lng: number | null
          notes: string | null
          order_id: string
          photo_urls: string[] | null
          scanned_by: string
          signature_url: string | null
          step: Database["public"]["Enums"]["handoff_step"]
          to_user_id: string | null
        }
        Insert: {
          bag_id: string
          created_at?: string | null
          from_user_id?: string | null
          id?: string
          location_lat?: number | null
          location_lng?: number | null
          notes?: string | null
          order_id: string
          photo_urls?: string[] | null
          scanned_by: string
          signature_url?: string | null
          step: Database["public"]["Enums"]["handoff_step"]
          to_user_id?: string | null
        }
        Update: {
          bag_id?: string
          created_at?: string | null
          from_user_id?: string | null
          id?: string
          location_lat?: number | null
          location_lng?: number | null
          notes?: string | null
          order_id?: string
          photo_urls?: string[] | null
          scanned_by?: string
          signature_url?: string | null
          step?: Database["public"]["Enums"]["handoff_step"]
          to_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "handoffs_bag_id_fkey"
            columns: ["bag_id"]
            isOneToOne: false
            referencedRelation: "bags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "handoffs_from_user_id_fkey"
            columns: ["from_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "handoffs_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "handoffs_scanned_by_fkey"
            columns: ["scanned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "handoffs_to_user_id_fkey"
            columns: ["to_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      hub_team: {
        Row: {
          created_at: string | null
          hub_id: string
          id: string
          permissions: Json | null
          role: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          hub_id: string
          id?: string
          permissions?: Json | null
          role?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          hub_id?: string
          id?: string
          permissions?: Json | null
          role?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hub_team_hub_id_fkey"
            columns: ["hub_id"]
            isOneToOne: false
            referencedRelation: "hubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hub_team_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      hubs: {
        Row: {
          abn: string | null
          address: Json
          business_name: string
          business_type: string | null
          capacity: number | null
          contact_name: string | null
          created_at: string | null
          current_load: number | null
          email: string | null
          express_price_per_bag: number | null
          id: string
          insurance_expiry: string | null
          insurance_policy: string | null
          is_active: boolean | null
          is_ndis_approved: boolean | null
          is_verified: boolean | null
          location: unknown
          operating_hours: Json | null
          owner_id: string
          paused: boolean | null
          phone: string | null
          photos: string[] | null
          price_per_bag: number | null
          rating_avg: number | null
          rating_count: number | null
          services: string[] | null
          stripe_connect_id: string | null
          stripe_onboarding_complete: boolean | null
          updated_at: string | null
          verification_methods: string[] | null
        }
        Insert: {
          abn?: string | null
          address: Json
          business_name: string
          business_type?: string | null
          capacity?: number | null
          contact_name?: string | null
          created_at?: string | null
          current_load?: number | null
          email?: string | null
          express_price_per_bag?: number | null
          id?: string
          insurance_expiry?: string | null
          insurance_policy?: string | null
          is_active?: boolean | null
          is_ndis_approved?: boolean | null
          is_verified?: boolean | null
          location?: unknown
          operating_hours?: Json | null
          owner_id: string
          paused?: boolean | null
          phone?: string | null
          photos?: string[] | null
          price_per_bag?: number | null
          rating_avg?: number | null
          rating_count?: number | null
          services?: string[] | null
          stripe_connect_id?: string | null
          stripe_onboarding_complete?: boolean | null
          updated_at?: string | null
          verification_methods?: string[] | null
        }
        Update: {
          abn?: string | null
          address?: Json
          business_name?: string
          business_type?: string | null
          capacity?: number | null
          contact_name?: string | null
          created_at?: string | null
          current_load?: number | null
          email?: string | null
          express_price_per_bag?: number | null
          id?: string
          insurance_expiry?: string | null
          insurance_policy?: string | null
          is_active?: boolean | null
          is_ndis_approved?: boolean | null
          is_verified?: boolean | null
          location?: unknown
          operating_hours?: Json | null
          owner_id?: string
          paused?: boolean | null
          phone?: string | null
          photos?: string[] | null
          price_per_bag?: number | null
          rating_avg?: number | null
          rating_count?: number | null
          services?: string[] | null
          stripe_connect_id?: string | null
          stripe_onboarding_complete?: boolean | null
          updated_at?: string | null
          verification_methods?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "hubs_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_transactions: {
        Row: {
          balance_after: number
          created_at: string | null
          description: string | null
          id: string
          order_id: string | null
          points: number
          profile_id: string
          type: string | null
        }
        Insert: {
          balance_after: number
          created_at?: string | null
          description?: string | null
          id?: string
          order_id?: string | null
          points: number
          profile_id: string
          type?: string | null
        }
        Update: {
          balance_after?: number
          created_at?: string | null
          description?: string | null
          id?: string
          order_id?: string | null
          points?: number
          profile_id?: string
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_transactions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ndis_invoices: {
        Row: {
          amount_cents: number
          created_at: string | null
          customer_id: string
          gst_cents: number | null
          id: string
          invoice_number: string
          ndis_number: string
          order_id: string
          participant_name: string
          pdf_url: string | null
          plan_manager: string | null
          service_date: string | null
          status: Database["public"]["Enums"]["ndis_invoice_status"] | null
          support_item_number: string | null
        }
        Insert: {
          amount_cents: number
          created_at?: string | null
          customer_id: string
          gst_cents?: number | null
          id?: string
          invoice_number?: string
          ndis_number: string
          order_id: string
          participant_name: string
          pdf_url?: string | null
          plan_manager?: string | null
          service_date?: string | null
          status?: Database["public"]["Enums"]["ndis_invoice_status"] | null
          support_item_number?: string | null
        }
        Update: {
          amount_cents?: number
          created_at?: string | null
          customer_id?: string
          gst_cents?: number | null
          id?: string
          invoice_number?: string
          ndis_number?: string
          order_id?: string
          participant_name?: string
          pdf_url?: string | null
          plan_manager?: string | null
          service_date?: string | null
          status?: Database["public"]["Enums"]["ndis_invoice_status"] | null
          support_item_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ndis_invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ndis_invoices_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          channel: string
          created_at: string | null
          id: string
          is_read: boolean | null
          order_id: string | null
          profile_id: string
          sent_at: string | null
          title: string | null
          type: string
        }
        Insert: {
          body: string
          channel: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          order_id?: string | null
          profile_id: string
          sent_at?: string | null
          title?: string | null
          type: string
        }
        Update: {
          body?: string
          channel?: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          order_id?: string | null
          profile_id?: string
          sent_at?: string | null
          title?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          bag_id: string | null
          id: string
          item_type: string | null
          notes: string | null
          order_id: string
          quantity: number | null
          unit_price_cents: number | null
        }
        Insert: {
          bag_id?: string | null
          id?: string
          item_type?: string | null
          notes?: string | null
          order_id: string
          quantity?: number | null
          unit_price_cents?: number | null
        }
        Update: {
          bag_id?: string | null
          id?: string
          item_type?: string | null
          notes?: string | null
          order_id?: string
          quantity?: number | null
          unit_price_cents?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_bag_id_fkey"
            columns: ["bag_id"]
            isOneToOne: false
            referencedRelation: "bags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_ratings: {
        Row: {
          created_at: string | null
          customer_id: string
          id: string
          order_id: string
          rated_entity_id: string
          rated_entity_type: string
          review_text: string | null
          stars: number
          tags: string[] | null
        }
        Insert: {
          created_at?: string | null
          customer_id: string
          id?: string
          order_id: string
          rated_entity_id: string
          rated_entity_type: string
          review_text?: string | null
          stars: number
          tags?: string[] | null
        }
        Update: {
          created_at?: string | null
          customer_id?: string
          id?: string
          order_id?: string
          rated_entity_id?: string
          rated_entity_type?: string
          review_text?: string | null
          stars?: number
          tags?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "order_ratings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_ratings_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          addon_fees_cents: number | null
          addons: Json | null
          completed_at: string | null
          created_at: string | null
          customer_id: string
          delivery_address: Json
          delivery_fee_cents: number | null
          delivery_scheduled_at: string | null
          dispatch_order_id: string | null
          dispatch_provider:
            | Database["public"]["Enums"]["dispatch_provider"]
            | null
          driver_deliver_id: string | null
          driver_payout_cents: number | null
          driver_pickup_id: string | null
          estimated_ready_at: string | null
          express_fee_cents: number | null
          hub_id: string | null
          hub_payout_cents: number | null
          id: string
          is_ndis: boolean | null
          ndis_invoice_id: string | null
          order_number: string
          payment_status: string | null
          pickup_address: Json
          pickup_otp: string | null
          delivery_otp: string | null
          pickup_fee_cents: number | null
          pickup_scheduled_at: string | null
          platform_fee_cents: number | null
          pro_id: string | null
          pro_payout_cents: number | null
          service_type: Database["public"]["Enums"]["service_type"]
          special_instructions: string | null
          status: Database["public"]["Enums"]["order_status"] | null
          stripe_payment_intent_id: string | null
          stripe_transfer_ids: Json | null
          subtotal_cents: number | null
          total_cents: number | null
          updated_at: string | null
        }
        Insert: {
          addon_fees_cents?: number | null
          addons?: Json | null
          completed_at?: string | null
          created_at?: string | null
          customer_id: string
          delivery_address: Json
          delivery_fee_cents?: number | null
          delivery_scheduled_at?: string | null
          dispatch_order_id?: string | null
          dispatch_provider?:
            | Database["public"]["Enums"]["dispatch_provider"]
            | null
          driver_deliver_id?: string | null
          driver_payout_cents?: number | null
          driver_pickup_id?: string | null
          estimated_ready_at?: string | null
          express_fee_cents?: number | null
          hub_id?: string | null
          hub_payout_cents?: number | null
          id?: string
          is_ndis?: boolean | null
          ndis_invoice_id?: string | null
          order_number?: string
          payment_status?: string | null
          pickup_address: Json
          pickup_otp?: string | null
          delivery_otp?: string | null
          pickup_fee_cents?: number | null
          pickup_scheduled_at?: string | null
          platform_fee_cents?: number | null
          pro_id?: string | null
          pro_payout_cents?: number | null
          service_type?: Database["public"]["Enums"]["service_type"]
          special_instructions?: string | null
          status?: Database["public"]["Enums"]["order_status"] | null
          stripe_payment_intent_id?: string | null
          stripe_transfer_ids?: Json | null
          subtotal_cents?: number | null
          total_cents?: number | null
          updated_at?: string | null
        }
        Update: {
          addon_fees_cents?: number | null
          addons?: Json | null
          completed_at?: string | null
          created_at?: string | null
          customer_id?: string
          delivery_address?: Json
          delivery_fee_cents?: number | null
          delivery_scheduled_at?: string | null
          dispatch_order_id?: string | null
          dispatch_provider?:
            | Database["public"]["Enums"]["dispatch_provider"]
            | null
          driver_deliver_id?: string | null
          driver_payout_cents?: number | null
          driver_pickup_id?: string | null
          estimated_ready_at?: string | null
          express_fee_cents?: number | null
          hub_id?: string | null
          hub_payout_cents?: number | null
          id?: string
          is_ndis?: boolean | null
          ndis_invoice_id?: string | null
          order_number?: string
          payment_status?: string | null
          pickup_address?: Json
          pickup_otp?: string | null
          delivery_otp?: string | null
          pickup_fee_cents?: number | null
          pickup_scheduled_at?: string | null
          platform_fee_cents?: number | null
          pro_id?: string | null
          pro_payout_cents?: number | null
          service_type?: Database["public"]["Enums"]["service_type"]
          special_instructions?: string | null
          status?: Database["public"]["Enums"]["order_status"] | null
          stripe_payment_intent_id?: string | null
          stripe_transfer_ids?: Json | null
          subtotal_cents?: number | null
          total_cents?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_driver_deliver_id_fkey"
            columns: ["driver_deliver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_driver_pickup_id_fkey"
            columns: ["driver_pickup_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_hub_id_fkey"
            columns: ["hub_id"]
            isOneToOne: false
            referencedRelation: "hubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_ndis_invoice_fk"
            columns: ["ndis_invoice_id"]
            isOneToOne: false
            referencedRelation: "ndis_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_pro_id_fkey"
            columns: ["pro_id"]
            isOneToOne: false
            referencedRelation: "pros"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_ledger: {
        Row: {
          amount_cents: number
          created_at: string | null
          id: string
          order_id: string
          profile_id: string
          status: Database["public"]["Enums"]["payment_status"] | null
          stripe_event_id: string | null
          stripe_transfer_id: string | null
          type: Database["public"]["Enums"]["payment_type"]
        }
        Insert: {
          amount_cents: number
          created_at?: string | null
          id?: string
          order_id: string
          profile_id: string
          status?: Database["public"]["Enums"]["payment_status"] | null
          stripe_event_id?: string | null
          stripe_transfer_id?: string | null
          type: Database["public"]["Enums"]["payment_type"]
        }
        Update: {
          amount_cents?: number
          created_at?: string | null
          id?: string
          order_id?: string
          profile_id?: string
          status?: Database["public"]["Enums"]["payment_status"] | null
          stripe_event_id?: string | null
          stripe_transfer_id?: string | null
          type?: Database["public"]["Enums"]["payment_type"]
        }
        Relationships: [
          {
            foreignKeyName: "payment_ledger_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_ledger_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_config: {
        Row: {
          delivery_fee_cents: number | null
          driver_fee_base_cents: number | null
          driver_fee_per_km_cents: number | null
          express_surcharge_cents: number | null
          family_bag_cents: number | null
          hub_share_percent: number | null
          id: string
          individual_bag_cents: number | null
          ironing_addon_cents: number | null
          min_order_cents: number | null
          pickup_fee_cents: number | null
          platform_share_percent: number | null
          points_per_dollar: number | null
          points_redeem_rate: number | null
          referee_reward_points: number | null
          referrer_reward_points: number | null
          default_verification_methods: string[] | null
          updated_at: string | null
        }
        Insert: {
          default_verification_methods?: string[] | null
          delivery_fee_cents?: number | null
          driver_fee_base_cents?: number | null
          driver_fee_per_km_cents?: number | null
          express_surcharge_cents?: number | null
          family_bag_cents?: number | null
          hub_share_percent?: number | null
          id?: string
          individual_bag_cents?: number | null
          ironing_addon_cents?: number | null
          min_order_cents?: number | null
          pickup_fee_cents?: number | null
          platform_share_percent?: number | null
          points_per_dollar?: number | null
          points_redeem_rate?: number | null
          referee_reward_points?: number | null
          referrer_reward_points?: number | null
          updated_at?: string | null
        }
        Update: {
          default_verification_methods?: string[] | null
          delivery_fee_cents?: number | null
          driver_fee_base_cents?: number | null
          driver_fee_per_km_cents?: number | null
          express_surcharge_cents?: number | null
          family_bag_cents?: number | null
          hub_share_percent?: number | null
          id?: string
          individual_bag_cents?: number | null
          ironing_addon_cents?: number | null
          min_order_cents?: number | null
          pickup_fee_cents?: number | null
          platform_share_percent?: number | null
          points_per_dollar?: number | null
          points_redeem_rate?: number | null
          referee_reward_points?: number | null
          referrer_reward_points?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: Json | null
          avatar_url: string | null
          created_at: string | null
          full_name: string | null
          id: string
          is_active: boolean | null
          loyalty_points: number | null
          loyalty_tier: Database["public"]["Enums"]["loyalty_tier"] | null
          ndis_number: string | null
          ndis_plan_manager: string | null
          phone: string | null
          phone_verified: boolean | null
          referral_code: string | null
          referred_by: string | null
          role: Database["public"]["Enums"]["user_role"]
          stripe_customer_id: string | null
          updated_at: string | null
        }
        Insert: {
          address?: Json | null
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id: string
          is_active?: boolean | null
          loyalty_points?: number | null
          loyalty_tier?: Database["public"]["Enums"]["loyalty_tier"] | null
          ndis_number?: string | null
          ndis_plan_manager?: string | null
          phone?: string | null
          phone_verified?: boolean | null
          referral_code?: string | null
          referred_by?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          stripe_customer_id?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: Json | null
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          loyalty_points?: number | null
          loyalty_tier?: Database["public"]["Enums"]["loyalty_tier"] | null
          ndis_number?: string | null
          ndis_plan_manager?: string | null
          phone?: string | null
          phone_verified?: boolean | null
          referral_code?: string | null
          referred_by?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          stripe_customer_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pros: {
        Row: {
          abn: string | null
          address: Json | null
          affiliated_hub_id: string | null
          availability: Json | null
          bio: string | null
          created_at: string | null
          detergent_type: string | null
          express_price_per_bag: number | null
          fit2work_reference: string | null
          handles_own_delivery: boolean | null
          has_dryer: boolean | null
          has_iron: boolean | null
          id: string
          id_verified: boolean | null
          is_active: boolean | null
          is_available: boolean | null
          location: unknown
          machine_capacity_kg: number | null
          machine_type: string | null
          max_bags_per_day: number | null
          paused: boolean | null
          pledge_signed: boolean | null
          police_check_date: string | null
          police_check_status:
            | Database["public"]["Enums"]["fit2work_status"]
            | null
          price_per_bag: number | null
          quiz_passed: boolean | null
          rating_avg: number | null
          rating_count: number | null
          services: string[] | null
          setup_photo_url: string | null
          stripe_connect_id: string | null
          stripe_onboarding_complete: boolean | null
          tier: Database["public"]["Enums"]["pro_tier"] | null
          total_orders: number | null
          updated_at: string | null
        }
        Insert: {
          abn?: string | null
          address?: Json | null
          affiliated_hub_id?: string | null
          availability?: Json | null
          bio?: string | null
          created_at?: string | null
          detergent_type?: string | null
          express_price_per_bag?: number | null
          fit2work_reference?: string | null
          handles_own_delivery?: boolean | null
          has_dryer?: boolean | null
          has_iron?: boolean | null
          id: string
          id_verified?: boolean | null
          is_active?: boolean | null
          is_available?: boolean | null
          location?: unknown
          machine_capacity_kg?: number | null
          machine_type?: string | null
          max_bags_per_day?: number | null
          paused?: boolean | null
          pledge_signed?: boolean | null
          police_check_date?: string | null
          police_check_status?:
            | Database["public"]["Enums"]["fit2work_status"]
            | null
          price_per_bag?: number | null
          quiz_passed?: boolean | null
          rating_avg?: number | null
          rating_count?: number | null
          services?: string[] | null
          setup_photo_url?: string | null
          stripe_connect_id?: string | null
          stripe_onboarding_complete?: boolean | null
          tier?: Database["public"]["Enums"]["pro_tier"] | null
          total_orders?: number | null
          updated_at?: string | null
        }
        Update: {
          abn?: string | null
          address?: Json | null
          affiliated_hub_id?: string | null
          availability?: Json | null
          bio?: string | null
          created_at?: string | null
          detergent_type?: string | null
          express_price_per_bag?: number | null
          fit2work_reference?: string | null
          handles_own_delivery?: boolean | null
          has_dryer?: boolean | null
          has_iron?: boolean | null
          id?: string
          id_verified?: boolean | null
          is_active?: boolean | null
          is_available?: boolean | null
          location?: unknown
          machine_capacity_kg?: number | null
          machine_type?: string | null
          max_bags_per_day?: number | null
          paused?: boolean | null
          pledge_signed?: boolean | null
          police_check_date?: string | null
          police_check_status?:
            | Database["public"]["Enums"]["fit2work_status"]
            | null
          price_per_bag?: number | null
          quiz_passed?: boolean | null
          rating_avg?: number | null
          rating_count?: number | null
          services?: string[] | null
          setup_photo_url?: string | null
          stripe_connect_id?: string | null
          stripe_onboarding_complete?: boolean | null
          tier?: Database["public"]["Enums"]["pro_tier"] | null
          total_orders?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pros_affiliated_hub_id_fkey"
            columns: ["affiliated_hub_id"]
            isOneToOne: false
            referencedRelation: "hubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pros_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          created_at: string | null
          id: string
          referee_id: string
          referrer_id: string
          reward_points: number | null
          rewarded_at: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          referee_id: string
          referrer_id: string
          reward_points?: number | null
          rewarded_at?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          referee_id?: string
          referrer_id?: string
          reward_points?: number | null
          rewarded_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "referrals_referee_id_fkey"
            columns: ["referee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      spatial_ref_sys: {
        Row: {
          auth_name: string | null
          auth_srid: number | null
          proj4text: string | null
          srid: number
          srtext: string | null
        }
        Insert: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid: number
          srtext?: string | null
        }
        Update: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid?: number
          srtext?: string | null
        }
        Relationships: []
      }
      system_events: {
        Row: {
          actor_id: string | null
          created_at: string | null
          entity_id: string | null
          entity_type: string | null
          event_type: string
          id: string
          metadata: Json | null
          severity: Database["public"]["Enums"]["event_severity"] | null
        }
        Insert: {
          actor_id?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          severity?: Database["public"]["Enums"]["event_severity"] | null
        }
        Update: {
          actor_id?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          severity?: Database["public"]["Enums"]["event_severity"] | null
        }
        Relationships: [
          {
            foreignKeyName: "system_events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      verification_queue: {
        Row: {
          entity_id: string
          entity_type: string
          id: string
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          submitted_at: string | null
        }
        Insert: {
          entity_id: string
          entity_type: string
          id?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          submitted_at?: string | null
        }
        Update: {
          entity_id?: string
          entity_type?: string
          id?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          submitted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "verification_queue_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      geography_columns: {
        Row: {
          coord_dimension: number | null
          f_geography_column: unknown
          f_table_catalog: unknown
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Relationships: []
      }
      geometry_columns: {
        Row: {
          coord_dimension: number | null
          f_geometry_column: unknown
          f_table_catalog: string | null
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Insert: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Update: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      _postgis_deprecate: {
        Args: { newname: string; oldname: string; version: string }
        Returns: undefined
      }
      _postgis_index_extent: {
        Args: { col: string; tbl: unknown }
        Returns: unknown
      }
      _postgis_pgsql_version: { Args: never; Returns: string }
      _postgis_scripts_pgsql_version: { Args: never; Returns: string }
      _postgis_selectivity: {
        Args: { att_name: string; geom: unknown; mode?: string; tbl: unknown }
        Returns: number
      }
      _postgis_stats: {
        Args: { ""?: string; att_name: string; tbl: unknown }
        Returns: string
      }
      _st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_crosses: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      _st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_intersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      _st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      _st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      _st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_sortablehash: { Args: { geom: unknown }; Returns: number }
      _st_touches: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_voronoi: {
        Args: {
          clip?: unknown
          g1: unknown
          return_polygons?: boolean
          tolerance?: number
        }
        Returns: unknown
      }
      _st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      addauth: { Args: { "": string }; Returns: boolean }
      addgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              new_dim: number
              new_srid_in: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
      current_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      disablelongtransactions: { Args: never; Returns: string }
      dropgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { column_name: string; table_name: string }; Returns: string }
      dropgeometrytable:
        | {
            Args: {
              catalog_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { schema_name: string; table_name: string }; Returns: string }
        | { Args: { table_name: string }; Returns: string }
      enablelongtransactions: { Args: never; Returns: string }
      equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      geometry: { Args: { "": string }; Returns: unknown }
      geometry_above: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_below: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_cmp: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_contained_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_distance_box: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_distance_centroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_eq: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_ge: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_gt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_le: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_left: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_lt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overabove: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overbelow: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overleft: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overright: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_right: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_within: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geomfromewkt: { Args: { "": string }; Returns: unknown }
      gettransactionid: { Args: never; Returns: unknown }
      is_admin: { Args: never; Returns: boolean }
      longtransactionsenabled: { Args: never; Returns: boolean }
      populate_geometry_columns:
        | { Args: { tbl_oid: unknown; use_typmod?: boolean }; Returns: number }
        | { Args: { use_typmod?: boolean }; Returns: string }
      postgis_constraint_dims: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_srid: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_type: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: string
      }
      postgis_extensions_upgrade: { Args: never; Returns: string }
      postgis_full_version: { Args: never; Returns: string }
      postgis_geos_version: { Args: never; Returns: string }
      postgis_lib_build_date: { Args: never; Returns: string }
      postgis_lib_revision: { Args: never; Returns: string }
      postgis_lib_version: { Args: never; Returns: string }
      postgis_libjson_version: { Args: never; Returns: string }
      postgis_liblwgeom_version: { Args: never; Returns: string }
      postgis_libprotobuf_version: { Args: never; Returns: string }
      postgis_libxml_version: { Args: never; Returns: string }
      postgis_proj_version: { Args: never; Returns: string }
      postgis_scripts_build_date: { Args: never; Returns: string }
      postgis_scripts_installed: { Args: never; Returns: string }
      postgis_scripts_released: { Args: never; Returns: string }
      postgis_svn_version: { Args: never; Returns: string }
      postgis_type_name: {
        Args: {
          coord_dimension: number
          geomname: string
          use_new_name?: boolean
        }
        Returns: string
      }
      postgis_version: { Args: never; Returns: string }
      postgis_wagyu_version: { Args: never; Returns: string }
      st_3dclosestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3ddistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_3dlongestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmakebox: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmaxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dshortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_addpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_angle:
        | { Args: { line1: unknown; line2: unknown }; Returns: number }
        | {
            Args: { pt1: unknown; pt2: unknown; pt3: unknown; pt4?: unknown }
            Returns: number
          }
      st_area:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_asencodedpolyline: {
        Args: { geom: unknown; nprecision?: number }
        Returns: string
      }
      st_asewkt: { Args: { "": string }; Returns: string }
      st_asgeojson:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: {
              geom_column?: string
              maxdecimaldigits?: number
              pretty_bool?: boolean
              r: Record<string, unknown>
            }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_asgml:
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
            }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
      st_askml:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_aslatlontext: {
        Args: { geom: unknown; tmpl?: string }
        Returns: string
      }
      st_asmarc21: { Args: { format?: string; geom: unknown }; Returns: string }
      st_asmvtgeom: {
        Args: {
          bounds: unknown
          buffer?: number
          clip_geom?: boolean
          extent?: number
          geom: unknown
        }
        Returns: unknown
      }
      st_assvg:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_astext: { Args: { "": string }; Returns: string }
      st_astwkb:
        | {
            Args: {
              geom: unknown
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown[]
              ids: number[]
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
      st_asx3d: {
        Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
        Returns: string
      }
      st_azimuth:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: number }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_boundingdiagonal: {
        Args: { fits?: boolean; geom: unknown }
        Returns: unknown
      }
      st_buffer:
        | {
            Args: { geom: unknown; options?: string; radius: number }
            Returns: unknown
          }
        | {
            Args: { geom: unknown; quadsegs: number; radius: number }
            Returns: unknown
          }
      st_centroid: { Args: { "": string }; Returns: unknown }
      st_clipbybox2d: {
        Args: { box: unknown; geom: unknown }
        Returns: unknown
      }
      st_closestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_collect: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_concavehull: {
        Args: {
          param_allow_holes?: boolean
          param_geom: unknown
          param_pctconvex: number
        }
        Returns: unknown
      }
      st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_coorddim: { Args: { geometry: unknown }; Returns: number }
      st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_crosses: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_curvetoline: {
        Args: { flags?: number; geom: unknown; tol?: number; toltype?: number }
        Returns: unknown
      }
      st_delaunaytriangles: {
        Args: { flags?: number; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_difference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_disjoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_distance:
        | {
            Args: { geog1: unknown; geog2: unknown; use_spheroid?: boolean }
            Returns: number
          }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_distancesphere:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
        | {
            Args: { geom1: unknown; geom2: unknown; radius: number }
            Returns: number
          }
      st_distancespheroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_expand:
        | { Args: { box: unknown; dx: number; dy: number }; Returns: unknown }
        | {
            Args: { box: unknown; dx: number; dy: number; dz?: number }
            Returns: unknown
          }
        | {
            Args: {
              dm?: number
              dx: number
              dy: number
              dz?: number
              geom: unknown
            }
            Returns: unknown
          }
      st_force3d: { Args: { geom: unknown; zvalue?: number }; Returns: unknown }
      st_force3dm: {
        Args: { geom: unknown; mvalue?: number }
        Returns: unknown
      }
      st_force3dz: {
        Args: { geom: unknown; zvalue?: number }
        Returns: unknown
      }
      st_force4d: {
        Args: { geom: unknown; mvalue?: number; zvalue?: number }
        Returns: unknown
      }
      st_generatepoints:
        | { Args: { area: unknown; npoints: number }; Returns: unknown }
        | {
            Args: { area: unknown; npoints: number; seed: number }
            Returns: unknown
          }
      st_geogfromtext: { Args: { "": string }; Returns: unknown }
      st_geographyfromtext: { Args: { "": string }; Returns: unknown }
      st_geohash:
        | { Args: { geog: unknown; maxchars?: number }; Returns: string }
        | { Args: { geom: unknown; maxchars?: number }; Returns: string }
      st_geomcollfromtext: { Args: { "": string }; Returns: unknown }
      st_geometricmedian: {
        Args: {
          fail_if_not_converged?: boolean
          g: unknown
          max_iter?: number
          tolerance?: number
        }
        Returns: unknown
      }
      st_geometryfromtext: { Args: { "": string }; Returns: unknown }
      st_geomfromewkt: { Args: { "": string }; Returns: unknown }
      st_geomfromgeojson:
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": string }; Returns: unknown }
      st_geomfromgml: { Args: { "": string }; Returns: unknown }
      st_geomfromkml: { Args: { "": string }; Returns: unknown }
      st_geomfrommarc21: { Args: { marc21xml: string }; Returns: unknown }
      st_geomfromtext: { Args: { "": string }; Returns: unknown }
      st_gmltosql: { Args: { "": string }; Returns: unknown }
      st_hasarc: { Args: { geometry: unknown }; Returns: boolean }
      st_hausdorffdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_hexagon: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_hexagongrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_interpolatepoint: {
        Args: { line: unknown; point: unknown }
        Returns: number
      }
      st_intersection: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_intersects:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_isvaliddetail: {
        Args: { flags?: number; geom: unknown }
        Returns: Database["public"]["CompositeTypes"]["valid_detail"]
        SetofOptions: {
          from: "*"
          to: "valid_detail"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      st_length:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_letters: { Args: { font?: Json; letters: string }; Returns: unknown }
      st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      st_linefromencodedpolyline: {
        Args: { nprecision?: number; txtin: string }
        Returns: unknown
      }
      st_linefromtext: { Args: { "": string }; Returns: unknown }
      st_linelocatepoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_linetocurve: { Args: { geometry: unknown }; Returns: unknown }
      st_locatealong: {
        Args: { geometry: unknown; leftrightoffset?: number; measure: number }
        Returns: unknown
      }
      st_locatebetween: {
        Args: {
          frommeasure: number
          geometry: unknown
          leftrightoffset?: number
          tomeasure: number
        }
        Returns: unknown
      }
      st_locatebetweenelevations: {
        Args: { fromelevation: number; geometry: unknown; toelevation: number }
        Returns: unknown
      }
      st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makebox2d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makeline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makevalid: {
        Args: { geom: unknown; params: string }
        Returns: unknown
      }
      st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_minimumboundingcircle: {
        Args: { inputgeom: unknown; segs_per_quarter?: number }
        Returns: unknown
      }
      st_mlinefromtext: { Args: { "": string }; Returns: unknown }
      st_mpointfromtext: { Args: { "": string }; Returns: unknown }
      st_mpolyfromtext: { Args: { "": string }; Returns: unknown }
      st_multilinestringfromtext: { Args: { "": string }; Returns: unknown }
      st_multipointfromtext: { Args: { "": string }; Returns: unknown }
      st_multipolygonfromtext: { Args: { "": string }; Returns: unknown }
      st_node: { Args: { g: unknown }; Returns: unknown }
      st_normalize: { Args: { geom: unknown }; Returns: unknown }
      st_offsetcurve: {
        Args: { distance: number; line: unknown; params?: string }
        Returns: unknown
      }
      st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_perimeter: {
        Args: { geog: unknown; use_spheroid?: boolean }
        Returns: number
      }
      st_pointfromtext: { Args: { "": string }; Returns: unknown }
      st_pointm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
        }
        Returns: unknown
      }
      st_pointz: {
        Args: {
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_pointzm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_polyfromtext: { Args: { "": string }; Returns: unknown }
      st_polygonfromtext: { Args: { "": string }; Returns: unknown }
      st_project: {
        Args: { azimuth: number; distance: number; geog: unknown }
        Returns: unknown
      }
      st_quantizecoordinates: {
        Args: {
          g: unknown
          prec_m?: number
          prec_x: number
          prec_y?: number
          prec_z?: number
        }
        Returns: unknown
      }
      st_reduceprecision: {
        Args: { geom: unknown; gridsize: number }
        Returns: unknown
      }
      st_relate: { Args: { geom1: unknown; geom2: unknown }; Returns: string }
      st_removerepeatedpoints: {
        Args: { geom: unknown; tolerance?: number }
        Returns: unknown
      }
      st_segmentize: {
        Args: { geog: unknown; max_segment_length: number }
        Returns: unknown
      }
      st_setsrid:
        | { Args: { geog: unknown; srid: number }; Returns: unknown }
        | { Args: { geom: unknown; srid: number }; Returns: unknown }
      st_sharedpaths: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_shortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_simplifypolygonhull: {
        Args: { geom: unknown; is_outer?: boolean; vertex_fraction: number }
        Returns: unknown
      }
      st_split: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_square: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_squaregrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_srid:
        | { Args: { geog: unknown }; Returns: number }
        | { Args: { geom: unknown }; Returns: number }
      st_subdivide: {
        Args: { geom: unknown; gridsize?: number; maxvertices?: number }
        Returns: unknown[]
      }
      st_swapordinates: {
        Args: { geom: unknown; ords: unknown }
        Returns: unknown
      }
      st_symdifference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_symmetricdifference: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_tileenvelope: {
        Args: {
          bounds?: unknown
          margin?: number
          x: number
          y: number
          zoom: number
        }
        Returns: unknown
      }
      st_touches: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_transform:
        | {
            Args: { from_proj: string; geom: unknown; to_proj: string }
            Returns: unknown
          }
        | {
            Args: { from_proj: string; geom: unknown; to_srid: number }
            Returns: unknown
          }
        | { Args: { geom: unknown; to_proj: string }; Returns: unknown }
      st_triangulatepolygon: { Args: { g1: unknown }; Returns: unknown }
      st_union:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
        | {
            Args: { geom1: unknown; geom2: unknown; gridsize: number }
            Returns: unknown
          }
      st_voronoilines: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_voronoipolygons: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_wkbtosql: { Args: { wkb: string }; Returns: unknown }
      st_wkttosql: { Args: { "": string }; Returns: unknown }
      st_wrapx: {
        Args: { geom: unknown; move: number; wrap: number }
        Returns: unknown
      }
      unlockrows: { Args: { "": string }; Returns: number }
      updategeometrysrid: {
        Args: {
          catalogn_name: string
          column_name: string
          new_srid_in: number
          schema_name: string
          table_name: string
        }
        Returns: string
      }
    }
    Enums: {
      bag_status:
        | "unassigned"
        | "in_transit_to_hub"
        | "at_hub"
        | "with_pro"
        | "in_transit_to_customer"
        | "delivered"
      dispatch_provider: "uberdirect" | "doordash" | "native"
      event_severity: "info" | "warn" | "error"
      fit2work_status:
        | "not_submitted"
        | "pending"
        | "clear"
        | "caution"
        | "adverse"
      handoff_step:
        | "customer_to_driver"
        | "driver_to_hub"
        | "hub_to_pro"
        | "pro_to_hub"
        | "hub_to_driver"
        | "driver_to_customer"
      loyalty_tier: "bronze" | "silver" | "gold"
      ndis_invoice_status: "draft" | "sent" | "paid"
      order_status:
        | "pending"
        | "pickup_scheduled"
        | "picked_up_by_driver"
        | "at_hub"
        | "assigned_to_pro"
        | "with_pro"
        | "returned_to_hub"
        | "out_for_delivery"
        | "delivered"
        | "cancelled"
      payment_status: "pending" | "processing" | "completed" | "failed"
      payment_type:
        | "charge"
        | "payout_hub"
        | "payout_pro"
        | "payout_driver"
        | "refund"
        | "platform_fee"
        | "loyalty_credit"
      pro_tier: "rookie" | "elite" | "legendary"
      service_type: "wash_fold" | "dry_clean" | "iron" | "specialist"
      user_role: "customer" | "hub" | "pro" | "driver" | "admin"
    }
    CompositeTypes: {
      geometry_dump: {
        path: number[] | null
        geom: unknown
      }
      valid_detail: {
        valid: boolean | null
        reason: string | null
        location: unknown
      }
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      bag_status: [
        "unassigned",
        "in_transit_to_hub",
        "at_hub",
        "with_pro",
        "in_transit_to_customer",
        "delivered",
      ],
      dispatch_provider: ["uberdirect", "doordash", "native"],
      event_severity: ["info", "warn", "error"],
      fit2work_status: [
        "not_submitted",
        "pending",
        "clear",
        "caution",
        "adverse",
      ],
      handoff_step: [
        "customer_to_driver",
        "driver_to_hub",
        "hub_to_pro",
        "pro_to_hub",
        "hub_to_driver",
        "driver_to_customer",
      ],
      loyalty_tier: ["bronze", "silver", "gold"],
      ndis_invoice_status: ["draft", "sent", "paid"],
      order_status: [
        "pending",
        "pickup_scheduled",
        "picked_up_by_driver",
        "at_hub",
        "assigned_to_pro",
        "with_pro",
        "returned_to_hub",
        "out_for_delivery",
        "delivered",
        "cancelled",
      ],
      payment_status: ["pending", "processing", "completed", "failed"],
      payment_type: [
        "charge",
        "payout_hub",
        "payout_pro",
        "payout_driver",
        "refund",
        "platform_fee",
        "loyalty_credit",
      ],
      pro_tier: ["rookie", "elite", "legendary"],
      service_type: ["wash_fold", "dry_clean", "iron", "specialist"],
      user_role: ["customer", "hub", "pro", "driver", "admin"],
    },
  },
} as const
