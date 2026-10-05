/**
 * AgroMarket Database Schema Types
 * PostgreSQL / Supabase V1 Relational Type System
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      roles: {
        Row: {
          code: string;
          name: string;
          description: string | null;
          created_at: string;
        };
        Insert: {
          code: string;
          name: string;
          description?: string | null;
          created_at?: string;
        };
        Update: {
          code?: string;
          name?: string;
          description?: string | null;
          created_at?: string;
        };
      };
      profiles: {
        Row: {
          id: string;
          full_name: string;
          phone: string;
          email: string | null;
          avatar_url: string | null;
          location_address: string | null;
          state: string;
          lga: string;
          bio: string | null;
          is_verified: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name: string;
          phone: string;
          email?: string | null;
          avatar_url?: string | null;
          location_address?: string | null;
          state: string;
          lga: string;
          bio?: string | null;
          is_verified?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string;
          phone?: string;
          email?: string | null;
          avatar_url?: string | null;
          location_address?: string | null;
          state?: string;
          lga?: string;
          bio?: string | null;
          is_verified?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      user_roles: {
        Row: {
          user_id: string;
          role_code: string;
          assigned_at: string;
          assigned_by: string | null;
        };
        Insert: {
          user_id: string;
          role_code: string;
          assigned_at?: string;
          assigned_by?: string | null;
        };
        Update: {
          user_id?: string;
          role_code?: string;
          assigned_at?: string;
          assigned_by?: string | null;
        };
      };
      business_profiles: {
        Row: {
          id: string;
          user_id: string;
          company_name: string;
          rc_number: string | null;
          business_type: string;
          tax_id: string | null;
          state: string;
          lga: string;
          office_address: string;
          website: string | null;
          is_verified: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          company_name: string;
          rc_number?: string | null;
          business_type: string;
          tax_id?: string | null;
          state: string;
          lga: string;
          office_address: string;
          website?: string | null;
          is_verified?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          company_name?: string;
          rc_number?: string | null;
          business_type?: string;
          tax_id?: string | null;
          state?: string;
          lga?: string;
          office_address?: string;
          website?: string | null;
          is_verified?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      verification_records: {
        Row: {
          id: string;
          user_id: string;
          verification_type: string;
          document_reference: string | null;
          document_urls: string[];
          status: "PENDING" | "APPROVED" | "REJECTED";
          reviewer_id: string | null;
          rejection_reason: string | null;
          verified_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          verification_type: string;
          document_reference?: string | null;
          document_urls?: string[];
          status?: "PENDING" | "APPROVED" | "REJECTED";
          reviewer_id?: string | null;
          rejection_reason?: string | null;
          verified_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          verification_type?: string;
          document_reference?: string | null;
          document_urls?: string[];
          status?: "PENDING" | "APPROVED" | "REJECTED";
          reviewer_id?: string | null;
          rejection_reason?: string | null;
          verified_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      farms: {
        Row: {
          id: string;
          farmer_id: string;
          name: string;
          description: string | null;
          state: string;
          lga: string;
          address: string;
          latitude: number | null;
          longitude: number | null;
          size: number;
          size_unit: "HECTARES" | "ACRES" | "PLOTS" | "SQUARE_METERS";
          production_type: "CROPS" | "LIVESTOCK" | "MIXED" | "AQUACULTURE" | "HORTICULTURE";
          is_verified: boolean;
          is_public: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          farmer_id: string;
          name: string;
          description?: string | null;
          state: string;
          lga: string;
          address: string;
          latitude?: number | null;
          longitude?: number | null;
          size: number;
          size_unit?: "HECTARES" | "ACRES" | "PLOTS" | "SQUARE_METERS";
          production_type?: "CROPS" | "LIVESTOCK" | "MIXED" | "AQUACULTURE" | "HORTICULTURE";
          is_verified?: boolean;
          is_public?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          farmer_id?: string;
          name?: string;
          description?: string | null;
          state?: string;
          lga?: string;
          address?: string;
          latitude?: number | null;
          longitude?: number | null;
          size?: number;
          size_unit?: "HECTARES" | "ACRES" | "PLOTS" | "SQUARE_METERS";
          production_type?: "CROPS" | "LIVESTOCK" | "MIXED" | "AQUACULTURE" | "HORTICULTURE";
          is_verified?: boolean;
          is_public?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      categories: {
        Row: {
          id: string;
          name: string;
          slug: string;
          parent_id: string | null;
          description: string | null;
          image_url: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          parent_id?: string | null;
          description?: string | null;
          image_url?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          parent_id?: string | null;
          description?: string | null;
          image_url?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
      };
      products: {
        Row: {
          id: string;
          category_id: string;
          name: string;
          slug: string;
          scientific_name: string | null;
          description: string | null;
          default_unit: string;
          image_url: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          category_id: string;
          name: string;
          slug: string;
          scientific_name?: string | null;
          description?: string | null;
          default_unit?: string;
          image_url?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          category_id?: string;
          name?: string;
          slug?: string;
          scientific_name?: string | null;
          description?: string | null;
          default_unit?: string;
          image_url?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
      };
      farm_products: {
        Row: {
          id: string;
          farm_id: string;
          product_id: string;
          variety: string | null;
          estimated_annual_yield: number | null;
          yield_unit: string;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          farm_id: string;
          product_id: string;
          variety?: string | null;
          estimated_annual_yield?: number | null;
          yield_unit?: string;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          farm_id?: string;
          product_id?: string;
          variety?: string | null;
          estimated_annual_yield?: number | null;
          yield_unit?: string;
          is_active?: boolean;
          created_at?: string;
        };
      };
      listings: {
        Row: {
          id: string;
          seller_id: string;
          product_id: string;
          farm_id: string | null;
          title: string;
          description: string | null;
          price_per_unit: number;
          currency: string;
          unit: string;
          minimum_order_quantity: number;
          state: string;
          lga: string;
          pickup_address: string;
          status: "DRAFT" | "ACTIVE" | "PAUSED" | "OUT_OF_STOCK" | "ARCHIVED";
          is_verified: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          seller_id: string;
          product_id: string;
          farm_id?: string | null;
          title: string;
          description?: string | null;
          price_per_unit: number;
          currency?: string;
          unit: string;
          minimum_order_quantity?: number;
          state: string;
          lga: string;
          pickup_address: string;
          status?: "DRAFT" | "ACTIVE" | "PAUSED" | "OUT_OF_STOCK" | "ARCHIVED";
          is_verified?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          seller_id?: string;
          product_id?: string;
          farm_id?: string | null;
          title?: string;
          description?: string | null;
          price_per_unit?: number;
          currency?: string;
          unit?: string;
          minimum_order_quantity?: number;
          state?: string;
          lga?: string;
          pickup_address?: string;
          status?: "DRAFT" | "ACTIVE" | "PAUSED" | "OUT_OF_STOCK" | "ARCHIVED";
          is_verified?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      inventory: {
        Row: {
          id: string;
          listing_id: string;
          quantity_on_hand: number;
          quantity_reserved: number;
          quantity_available: number;
          updated_at: string;
        };
        Insert: {
          id?: string;
          listing_id: string;
          quantity_on_hand?: number;
          quantity_reserved?: number;
          updated_at?: string;
        };
        Update: {
          id?: string;
          listing_id?: string;
          quantity_on_hand?: number;
          quantity_reserved?: number;
          updated_at?: string;
        };
      };
      carts: {
        Row: {
          id: string;
          user_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      cart_items: {
        Row: {
          id: string;
          cart_id: string;
          listing_id: string;
          quantity: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          cart_id: string;
          listing_id: string;
          quantity: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          cart_id?: string;
          listing_id?: string;
          quantity?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      orders: {
        Row: {
          id: string;
          order_number: string;
          buyer_id: string;
          status: "PENDING" | "PAID" | "PROCESSING" | "PARTIALLY_FULFILLED" | "COMPLETED" | "CANCELLED" | "DISPUTED";
          currency: string;
          subtotal_amount: number;
          delivery_fee_amount: number;
          discount_amount: number;
          total_amount: number;
          delivery_address: string;
          delivery_state: string;
          delivery_lga: string;
          contact_phone: string;
          delivery_notes: string | null;
          shared_purchase_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          order_number: string;
          buyer_id: string;
          status?: "PENDING" | "PAID" | "PROCESSING" | "PARTIALLY_FULFILLED" | "COMPLETED" | "CANCELLED" | "DISPUTED";
          currency?: string;
          subtotal_amount: number;
          delivery_fee_amount?: number;
          discount_amount?: number;
          total_amount: number;
          delivery_address: string;
          delivery_state: string;
          delivery_lga: string;
          contact_phone: string;
          delivery_notes?: string | null;
          shared_purchase_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          order_number?: string;
          buyer_id?: string;
          status?: "PENDING" | "PAID" | "PROCESSING" | "PARTIALLY_FULFILLED" | "COMPLETED" | "CANCELLED" | "DISPUTED";
          currency?: string;
          subtotal_amount?: number;
          delivery_fee_amount?: number;
          discount_amount?: number;
          total_amount?: number;
          delivery_address?: string;
          delivery_state?: string;
          delivery_lga?: string;
          contact_phone?: string;
          delivery_notes?: string | null;
          shared_purchase_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          listing_id: string;
          seller_id: string;
          product_id: string;
          product_name_snapshot: string;
          unit_price_snapshot: number;
          quantity: number;
          unit_snapshot: string;
          total_price: number;
          status: "PENDING" | "CONFIRMED" | "PROCESSING" | "IN_TRANSIT" | "DELIVERED" | "CANCELLED" | "REFUNDED";
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          listing_id: string;
          seller_id: string;
          product_id: string;
          product_name_snapshot: string;
          unit_price_snapshot: number;
          quantity: number;
          unit_snapshot: string;
          total_price: number;
          status?: "PENDING" | "CONFIRMED" | "PROCESSING" | "IN_TRANSIT" | "DELIVERED" | "CANCELLED" | "REFUNDED";
          created_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          listing_id?: string;
          seller_id?: string;
          product_id?: string;
          product_name_snapshot?: string;
          unit_price_snapshot?: number;
          quantity?: number;
          unit_snapshot?: string;
          total_price?: number;
          status?: "PENDING" | "CONFIRMED" | "PROCESSING" | "IN_TRANSIT" | "DELIVERED" | "CANCELLED" | "REFUNDED";
          created_at?: string;
        };
      };
      payments: {
        Row: {
          id: string;
          order_id: string | null;
          buyer_id: string;
          amount: number;
          currency: string;
          provider: "PAYSTACK" | "FLUTTERWAVE" | "MONNIFY" | "BANK_TRANSFER" | "ESCROW_WALLET";
          provider_reference: string;
          status: "INITIALIZED" | "PENDING" | "SUCCESSFUL" | "FAILED" | "REFUNDED";
          payment_method: "CARD" | "BANK_TRANSFER" | "USSD" | "WALLET";
          channel_metadata: Json;
          paid_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          order_id?: string | null;
          buyer_id: string;
          amount: number;
          currency?: string;
          provider?: "PAYSTACK" | "FLUTTERWAVE" | "MONNIFY" | "BANK_TRANSFER" | "ESCROW_WALLET";
          provider_reference: string;
          status?: "INITIALIZED" | "PENDING" | "SUCCESSFUL" | "FAILED" | "REFUNDED";
          payment_method?: "CARD" | "BANK_TRANSFER" | "USSD" | "WALLET";
          channel_metadata?: Json;
          paid_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string | null;
          buyer_id?: string;
          amount?: number;
          currency?: string;
          provider?: "PAYSTACK" | "FLUTTERWAVE" | "MONNIFY" | "BANK_TRANSFER" | "ESCROW_WALLET";
          provider_reference?: string;
          status?: "INITIALIZED" | "PENDING" | "SUCCESSFUL" | "FAILED" | "REFUNDED";
          payment_method?: "CARD" | "BANK_TRANSFER" | "USSD" | "WALLET";
          channel_metadata?: Json;
          paid_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      logistics_providers: {
        Row: {
          id: string;
          name: string;
          company_rc: string | null;
          contact_person: string;
          phone: string;
          email: string | null;
          coverage_states: string[];
          fleet_types: string[];
          is_verified: boolean;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          company_rc?: string | null;
          contact_person: string;
          phone: string;
          email?: string | null;
          coverage_states?: string[];
          fleet_types?: string[];
          is_verified?: boolean;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          company_rc?: string | null;
          contact_person?: string;
          phone?: string;
          email?: string | null;
          coverage_states?: string[];
          fleet_types?: string[];
          is_verified?: boolean;
          is_active?: boolean;
          created_at?: string;
        };
      };
      deliveries: {
        Row: {
          id: string;
          order_id: string;
          provider_id: string | null;
          seller_id: string;
          pickup_address: string;
          pickup_state: string;
          pickup_lga: string;
          delivery_address: string;
          delivery_state: string;
          delivery_lga: string;
          recipient_name: string;
          recipient_phone: string;
          status: "PENDING_PICKUP" | "PICKED_UP" | "IN_TRANSIT" | "OUT_FOR_DELIVERY" | "DELIVERED" | "FAILED" | "RETURNED";
          tracking_number: string | null;
          proof_of_delivery_url: string | null;
          estimated_delivery_date: string | null;
          actual_delivery_date: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          provider_id?: string | null;
          seller_id: string;
          pickup_address: string;
          pickup_state: string;
          pickup_lga: string;
          delivery_address: string;
          delivery_state: string;
          delivery_lga: string;
          recipient_name: string;
          recipient_phone: string;
          status?: "PENDING_PICKUP" | "PICKED_UP" | "IN_TRANSIT" | "OUT_FOR_DELIVERY" | "DELIVERED" | "FAILED" | "RETURNED";
          tracking_number?: string | null;
          proof_of_delivery_url?: string | null;
          estimated_delivery_date?: string | null;
          actual_delivery_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          provider_id?: string | null;
          seller_id?: string;
          pickup_address?: string;
          pickup_state?: string;
          pickup_lga?: string;
          delivery_address?: string;
          delivery_state?: string;
          delivery_lga?: string;
          recipient_name?: string;
          recipient_phone?: string;
          status?: "PENDING_PICKUP" | "PICKED_UP" | "IN_TRANSIT" | "OUT_FOR_DELIVERY" | "DELIVERED" | "FAILED" | "RETURNED";
          tracking_number?: string | null;
          proof_of_delivery_url?: string | null;
          estimated_delivery_date?: string | null;
          actual_delivery_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      delivery_events: {
        Row: {
          id: string;
          delivery_id: string;
          status: string;
          location_name: string | null;
          description: string;
          occurred_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          delivery_id: string;
          status: string;
          location_name?: string | null;
          description: string;
          occurred_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          delivery_id?: string;
          status?: string;
          location_name?: string | null;
          description?: string;
          occurred_at?: string;
          created_at?: string;
        };
      };
      shared_purchases: {
        Row: {
          id: string;
          listing_id: string;
          created_by: string;
          title: string;
          description: string | null;
          produce_type: "CROP" | "ANIMAL_PRODUCT";
          purchase_type: "BULK_CROP" | "ANIMAL_PORTION";
          total_quantity: number;
          allocated_quantity: number;
          remaining_quantity: number;
          unit: string;
          unit_price: number;
          total_price: number;
          target_participants: number;
          current_participants: number;
          min_share_quantity: number;
          max_share_quantity: number | null;
          portion_model: "FRACTIONAL" | "WEIGHT_BASED" | null;
          portion_fractions: Record<string, unknown>[] | unknown[];
          metadata: Record<string, unknown> | null;
          deadline: string;
          status: "DRAFT" | "OPEN" | "TARGET_REACHED" | "PAYMENT_PENDING" | "CONFIRMED" | "FULFILMENT" | "COMPLETED" | "CANCELLED" | "EXPIRED";
          pickup_hub_location: string;
          hub_state: string;
          hub_lga: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          listing_id: string;
          created_by: string;
          title: string;
          description?: string | null;
          produce_type?: "CROP" | "ANIMAL_PRODUCT";
          purchase_type?: "BULK_CROP" | "ANIMAL_PORTION";
          total_quantity: number;
          allocated_quantity?: number;
          max_share_quantity?: number | null;
          portion_model?: "FRACTIONAL" | "WEIGHT_BASED" | null;
          portion_fractions?: Record<string, unknown>[] | unknown[];
          metadata?: Record<string, unknown> | null;
          unit: string;
          unit_price: number;
          total_price: number;
          target_participants: number;
          current_participants?: number;
          min_share_quantity?: number;
          deadline: string;
          status?: "DRAFT" | "OPEN" | "TARGET_REACHED" | "PAYMENT_PENDING" | "CONFIRMED" | "FULFILMENT" | "COMPLETED" | "CANCELLED" | "EXPIRED";
          pickup_hub_location: string;
          hub_state: string;
          hub_lga: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          listing_id?: string;
          created_by?: string;
          title?: string;
          description?: string | null;
          produce_type?: "CROP" | "ANIMAL_PRODUCT";
          purchase_type?: "BULK_CROP" | "ANIMAL_PORTION";
          total_quantity?: number;
          allocated_quantity?: number;
          max_share_quantity?: number | null;
          portion_model?: "FRACTIONAL" | "WEIGHT_BASED" | null;
          portion_fractions?: Record<string, unknown>[] | unknown[];
          metadata?: Record<string, unknown> | null;
          unit?: string;
          unit_price?: number;
          total_price?: number;
          target_participants?: number;
          current_participants?: number;
          min_share_quantity?: number;
          deadline?: string;
          status?: "DRAFT" | "OPEN" | "TARGET_REACHED" | "PAYMENT_PENDING" | "CONFIRMED" | "FULFILMENT" | "COMPLETED" | "CANCELLED" | "EXPIRED";
          pickup_hub_location?: string;
          hub_state?: string;
          hub_lga?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      shared_purchase_participants: {
        Row: {
          id: string;
          shared_purchase_id: string;
          user_id: string;
          order_id: string | null;
          shares_count: number;
          share_amount: number;
          unit: string;
          unit_price: number;
          portion_choice: string | null;
          payment_id: string | null;
          status: "PLEDGED" | "PAYMENT_PENDING" | "PAID" | "CONFIRMED" | "FULFILLED" | "CANCELLED" | "REFUNDED";
          portion_allocation_notes: string | null;
          metadata: Record<string, unknown> | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          shared_purchase_id: string;
          user_id: string;
          order_id?: string | null;
          shares_count: number;
          share_amount: number;
          unit?: string;
          unit_price?: number;
          portion_choice?: string | null;
          payment_id?: string | null;
          status?: "PLEDGED" | "PAYMENT_PENDING" | "PAID" | "CONFIRMED" | "FULFILLED" | "CANCELLED" | "REFUNDED";
          portion_allocation_notes?: string | null;
          metadata?: Record<string, unknown> | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          shared_purchase_id?: string;
          user_id?: string;
          order_id?: string | null;
          shares_count?: number;
          share_amount?: number;
          unit?: string;
          unit_price?: number;
          portion_choice?: string | null;
          payment_id?: string | null;
          status?: "PLEDGED" | "PAYMENT_PENDING" | "PAID" | "CONFIRMED" | "FULFILLED" | "CANCELLED" | "REFUNDED";
          portion_allocation_notes?: string | null;
          metadata?: Record<string, unknown> | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      jobs: {
        Row: {
          id: string;
          employer_id: string;
          title: string;
          description: string;
          category: string;
          state: string;
          lga: string;
          location_details: string | null;
          employment_type: string;
          compensation_type: string;
          compensation_amount: number;
          currency: string;
          requirements: string | null;
          deadline: string | null;
          status: "DRAFT" | "ACTIVE" | "PAUSED" | "CLOSED";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          employer_id: string;
          title: string;
          description: string;
          category: string;
          state: string;
          lga: string;
          location_details?: string | null;
          employment_type?: string;
          compensation_type?: string;
          compensation_amount: number;
          currency?: string;
          requirements?: string | null;
          deadline?: string | null;
          status?: "DRAFT" | "ACTIVE" | "PAUSED" | "CLOSED";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          employer_id?: string;
          title?: string;
          description?: string;
          category?: string;
          state?: string;
          lga?: string;
          location_details?: string | null;
          employment_type?: string;
          compensation_type?: string;
          compensation_amount?: number;
          currency?: string;
          requirements?: string | null;
          deadline?: string | null;
          status?: "DRAFT" | "ACTIVE" | "PAUSED" | "CLOSED";
          created_at?: string;
          updated_at?: string;
        };
      };
      job_applications: {
        Row: {
          id: string;
          job_id: string;
          applicant_id: string;
          cover_note: string | null;
          resume_url: string | null;
          status: "SUBMITTED" | "UNDER_REVIEW" | "SHORTLISTED" | "REJECTED" | "HIRED";
          reviewed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          job_id: string;
          applicant_id: string;
          cover_note?: string | null;
          resume_url?: string | null;
          status?: "SUBMITTED" | "UNDER_REVIEW" | "SHORTLISTED" | "REJECTED" | "HIRED";
          reviewed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          job_id?: string;
          applicant_id?: string;
          cover_note?: string | null;
          resume_url?: string | null;
          status?: "SUBMITTED" | "UNDER_REVIEW" | "SHORTLISTED" | "REJECTED" | "HIRED";
          reviewed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      services: {
        Row: {
          id: string;
          provider_id: string;
          title: string;
          description: string;
          service_category: string;
          coverage_states: string[];
          pricing_model: string;
          base_rate: number;
          currency: string;
          is_available: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          provider_id: string;
          title: string;
          description: string;
          service_category: string;
          coverage_states?: string[];
          pricing_model?: string;
          base_rate?: number;
          currency?: string;
          is_available?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          provider_id?: string;
          title?: string;
          description?: string;
          service_category?: string;
          coverage_states?: string[];
          pricing_model?: string;
          base_rate?: number;
          currency?: string;
          is_available?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      service_requests: {
        Row: {
          id: string;
          service_id: string;
          client_id: string;
          provider_id: string;
          details: string;
          state: string;
          lga: string;
          location_address: string;
          proposed_date: string;
          quoted_amount: number | null;
          currency: string;
          status: "PENDING" | "QUOTED" | "ACCEPTED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" | "DISPUTED";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          service_id: string;
          client_id: string;
          provider_id: string;
          details: string;
          state: string;
          lga: string;
          location_address: string;
          proposed_date: string;
          quoted_amount?: number | null;
          currency?: string;
          status?: "PENDING" | "QUOTED" | "ACCEPTED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" | "DISPUTED";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          service_id?: string;
          client_id?: string;
          provider_id?: string;
          details?: string;
          state?: string;
          lga?: string;
          location_address?: string;
          proposed_date?: string;
          quoted_amount?: number | null;
          currency?: string;
          status?: "PENDING" | "QUOTED" | "ACCEPTED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" | "DISPUTED";
          created_at?: string;
          updated_at?: string;
        };
      };
      equipment: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          category: string;
          make_model: string | null;
          year_manufactured: number | null;
          description: string | null;
          location_state: string;
          location_lga: string;
          daily_rental_rate: number;
          caution_deposit: number;
          currency: string;
          operator_included: boolean;
          condition: "EXCELLENT" | "GOOD" | "FAIR";
          is_available: boolean;
          status: "ACTIVE" | "UNDER_MAINTENANCE" | "RENTED" | "DECOMMISSIONED";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          name: string;
          category: string;
          make_model?: string | null;
          year_manufactured?: number | null;
          description?: string | null;
          location_state: string;
          location_lga: string;
          daily_rental_rate: number;
          caution_deposit?: number;
          currency?: string;
          operator_included?: boolean;
          condition?: "EXCELLENT" | "GOOD" | "FAIR";
          is_available?: boolean;
          status?: "ACTIVE" | "UNDER_MAINTENANCE" | "RENTED" | "DECOMMISSIONED";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          name?: string;
          category?: string;
          make_model?: string | null;
          year_manufactured?: number | null;
          description?: string | null;
          location_state?: string;
          location_lga?: string;
          daily_rental_rate?: number;
          caution_deposit?: number;
          currency?: string;
          operator_included?: boolean;
          condition?: "EXCELLENT" | "GOOD" | "FAIR";
          is_available?: boolean;
          status?: "ACTIVE" | "UNDER_MAINTENANCE" | "RENTED" | "DECOMMISSIONED";
          created_at?: string;
          updated_at?: string;
        };
      };
      equipment_rentals: {
        Row: {
          id: string;
          equipment_id: string;
          renter_id: string;
          owner_id: string;
          start_date: string;
          end_date: string;
          total_days: number;
          daily_rate: number;
          total_rental_amount: number;
          deposit_amount: number;
          currency: string;
          status: "REQUESTED" | "APPROVED" | "ACTIVE" | "RETURNED" | "COMPLETED" | "CANCELLED" | "DISPUTED";
          handover_notes: string | null;
          return_notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          equipment_id: string;
          renter_id: string;
          owner_id: string;
          start_date: string;
          end_date: string;
          total_days: number;
          daily_rate: number;
          total_rental_amount: number;
          deposit_amount?: number;
          currency?: string;
          status?: "REQUESTED" | "APPROVED" | "ACTIVE" | "RETURNED" | "COMPLETED" | "CANCELLED" | "DISPUTED";
          handover_notes?: string | null;
          return_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          equipment_id?: string;
          renter_id?: string;
          owner_id?: string;
          start_date?: string;
          end_date?: string;
          total_days?: number;
          daily_rate?: number;
          total_rental_amount?: number;
          deposit_amount?: number;
          currency?: string;
          status?: "REQUESTED" | "APPROVED" | "ACTIVE" | "RETURNED" | "COMPLETED" | "CANCELLED" | "DISPUTED";
          handover_notes?: string | null;
          return_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      price_observations: {
        Row: {
          id: string;
          product_id: string;
          market_name: string;
          state: string;
          lga: string | null;
          price: number;
          currency: string;
          unit: string;
          normalized_price: number | null;
          normalized_unit: string | null;
          normalization_status: "EXACT" | "NORMALIZED" | "UNAVAILABLE";
          source_type: string;
          reported_by: string | null;
          verification_status: "UNVERIFIED" | "SELF_REPORTED" | "VERIFIED" | "SYSTEM_DERIVED" | "REJECTED";
          confidence_score: number | null;
          data_quality_label: "OBSERVED" | "VERIFIED" | "ESTIMATED" | "SIMULATED";
          observed_at: string;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          market_name: string;
          state: string;
          lga?: string | null;
          price: number;
          currency?: string;
          unit: string;
          normalized_price?: number | null;
          normalized_unit?: string | null;
          normalization_status?: "EXACT" | "NORMALIZED" | "UNAVAILABLE";
          source_type?: string;
          reported_by?: string | null;
          verification_status?: "UNVERIFIED" | "SELF_REPORTED" | "VERIFIED" | "SYSTEM_DERIVED" | "REJECTED";
          confidence_score?: number | null;
          data_quality_label?: "OBSERVED" | "VERIFIED" | "ESTIMATED" | "SIMULATED";
          observed_at: string;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          product_id?: string;
          market_name?: string;
          state?: string;
          lga?: string | null;
          price?: number;
          currency?: string;
          unit?: string;
          normalized_price?: number | null;
          normalized_unit?: string | null;
          normalization_status?: "EXACT" | "NORMALIZED" | "UNAVAILABLE";
          source_type?: string;
          reported_by?: string | null;
          verification_status?: "UNVERIFIED" | "SELF_REPORTED" | "VERIFIED" | "SYSTEM_DERIVED" | "REJECTED";
          confidence_score?: number | null;
          data_quality_label?: "OBSERVED" | "VERIFIED" | "ESTIMATED" | "SIMULATED";
          observed_at?: string;
          metadata?: Json;
          created_at?: string;
        };
      };
      demand_forecasts: {
        Row: {
          id: string;
          product_id: string;
          region_state: string;
          period_start: string;
          period_end: string;
          predicted_demand_volume: number;
          volume_unit: string;
          confidence_score: number | null;
          confidence_level: "LOW" | "MEDIUM" | "HIGH" | "INSUFFICIENT_DATA";
          forecast_method: string;
          forecast_horizon_days: number;
          data_window_days: number;
          data_quality_label: "ESTIMATED" | "SIMULATED" | "OBSERVED";
          model_metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          region_state: string;
          period_start: string;
          period_end: string;
          predicted_demand_volume: number;
          volume_unit?: string;
          confidence_score?: number | null;
          confidence_level?: "LOW" | "MEDIUM" | "HIGH" | "INSUFFICIENT_DATA";
          forecast_method?: string;
          forecast_horizon_days?: number;
          data_window_days?: number;
          data_quality_label?: "ESTIMATED" | "SIMULATED" | "OBSERVED";
          model_metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          product_id?: string;
          region_state?: string;
          period_start?: string;
          period_end?: string;
          predicted_demand_volume?: number;
          volume_unit?: string;
          confidence_score?: number | null;
          confidence_level?: "LOW" | "MEDIUM" | "HIGH" | "INSUFFICIENT_DATA";
          forecast_method?: string;
          forecast_horizon_days?: number;
          data_window_days?: number;
          data_quality_label?: "ESTIMATED" | "SIMULATED" | "OBSERVED";
          model_metadata?: Json;
          created_at?: string;
        };
      };
      user_preferences: {
        Row: {
          id: string;
          user_id: string;
          dietary_preferences: string[];
          family_size: number;
          budget_target_monthly: number | null;
          preferred_staples: string[];
          state: string | null;
          lga: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          dietary_preferences?: string[];
          family_size?: number;
          budget_target_monthly?: number | null;
          preferred_staples?: string[];
          state?: string | null;
          lga?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          dietary_preferences?: string[];
          family_size?: number;
          budget_target_monthly?: number | null;
          preferred_staples?: string[];
          state?: string | null;
          lga?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      basket_recommendations: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          recommended_items: Json;
          estimated_total_cost: number;
          estimated_savings: number;
          rationale: string;
          is_accepted: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          recommended_items?: Json;
          estimated_total_cost: number;
          estimated_savings?: number;
          rationale: string;
          is_accepted?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          recommended_items?: Json;
          estimated_total_cost?: number;
          estimated_savings?: number;
          rationale?: string;
          is_accepted?: boolean;
          created_at?: string;
        };
      };
      ai_conversations: {
        Row: {
          id: string;
          user_id: string;
          capability: "FARMER_AI" | "SMART_BASKET" | "FOOD_HEALTH" | "AGRONOMY";
          title: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          capability?: "FARMER_AI" | "SMART_BASKET" | "FOOD_HEALTH" | "AGRONOMY";
          title?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          capability?: "FARMER_AI" | "SMART_BASKET" | "FOOD_HEALTH" | "AGRONOMY";
          title?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      ai_messages: {
        Row: {
          id: string;
          conversation_id: string;
          role: "USER" | "ASSISTANT" | "SYSTEM";
          content: string;
          tokens_used: number;
          safety_flags: Json;
          disclaimer_acknowledged: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          role: "USER" | "ASSISTANT" | "SYSTEM";
          content: string;
          tokens_used?: number;
          safety_flags?: Json;
          disclaimer_acknowledged?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          role?: "USER" | "ASSISTANT" | "SYSTEM";
          content?: string;
          tokens_used?: number;
          safety_flags?: Json;
          disclaimer_acknowledged?: boolean;
          created_at?: string;
        };
      };
      knowledge_content: {
        Row: {
          id: string;
          author_id: string | null;
          title: string;
          slug: string;
          content_type: "EXPERT_GUIDE" | "GOVERNMENT_UPDATE" | "NEWS" | "GAP_TUTORIAL" | "EVENT";
          target_crops: string[];
          agro_ecological_zones: string[];
          body_markdown: string;
          summary: string | null;
          cover_image_url: string | null;
          is_published: boolean;
          published_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          author_id?: string | null;
          title: string;
          slug: string;
          content_type?: "EXPERT_GUIDE" | "GOVERNMENT_UPDATE" | "NEWS" | "GAP_TUTORIAL" | "EVENT";
          target_crops?: string[];
          agro_ecological_zones?: string[];
          body_markdown: string;
          summary?: string | null;
          cover_image_url?: string | null;
          is_published?: boolean;
          published_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          author_id?: string | null;
          title?: string;
          slug?: string;
          content_type?: "EXPERT_GUIDE" | "GOVERNMENT_UPDATE" | "NEWS" | "GAP_TUTORIAL" | "EVENT";
          target_crops?: string[];
          agro_ecological_zones?: string[];
          body_markdown?: string;
          summary?: string | null;
          cover_image_url?: string | null;
          is_published?: boolean;
          published_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      reviews: {
        Row: {
          id: string;
          author_id: string;
          order_id: string | null;
          listing_id: string | null;
          seller_id: string | null;
          service_id: string | null;
          equipment_id: string | null;
          rating: number;
          comment: string | null;
          is_verified_transaction: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          author_id: string;
          order_id?: string | null;
          listing_id?: string | null;
          seller_id?: string | null;
          service_id?: string | null;
          equipment_id?: string | null;
          rating: number;
          comment?: string | null;
          is_verified_transaction?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          author_id?: string;
          order_id?: string | null;
          listing_id?: string | null;
          seller_id?: string | null;
          service_id?: string | null;
          equipment_id?: string | null;
          rating?: number;
          comment?: string | null;
          is_verified_transaction?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      disputes: {
        Row: {
          id: string;
          opened_by: string;
          dispute_type: "ORDER" | "PAYMENT" | "DELIVERY" | "SERVICE" | "EQUIPMENT_RENTAL";
          related_order_id: string | null;
          related_payment_id: string | null;
          related_delivery_id: string | null;
          reason: string;
          description: string;
          evidence_urls: string[];
          status: "OPEN" | "UNDER_REVIEW" | "ESCROW_FROZEN" | "RESOLVED" | "REJECTED";
          assigned_admin_id: string | null;
          resolution_notes: string | null;
          resolved_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          opened_by: string;
          dispute_type: "ORDER" | "PAYMENT" | "DELIVERY" | "SERVICE" | "EQUIPMENT_RENTAL";
          related_order_id?: string | null;
          related_payment_id?: string | null;
          related_delivery_id?: string | null;
          reason: string;
          description: string;
          evidence_urls?: string[];
          status?: "OPEN" | "UNDER_REVIEW" | "ESCROW_FROZEN" | "RESOLVED" | "REJECTED";
          assigned_admin_id?: string | null;
          resolution_notes?: string | null;
          resolved_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          opened_by?: string;
          dispute_type?: "ORDER" | "PAYMENT" | "DELIVERY" | "SERVICE" | "EQUIPMENT_RENTAL";
          related_order_id?: string | null;
          related_payment_id?: string | null;
          related_delivery_id?: string | null;
          reason?: string;
          description?: string;
          evidence_urls?: string[];
          status?: "OPEN" | "UNDER_REVIEW" | "ESCROW_FROZEN" | "RESOLVED" | "REJECTED";
          assigned_admin_id?: string | null;
          resolution_notes?: string | null;
          resolved_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          channel: "IN_APP" | "SMS" | "WHATSAPP" | "EMAIL" | "PUSH";
          title: string;
          body: string;
          action_url: string | null;
          is_read: boolean;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: string;
          channel?: "IN_APP" | "SMS" | "WHATSAPP" | "EMAIL" | "PUSH";
          title: string;
          body: string;
          action_url?: string | null;
          is_read?: boolean;
          read_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: string;
          channel?: "IN_APP" | "SMS" | "WHATSAPP" | "EMAIL" | "PUSH";
          title?: string;
          body?: string;
          action_url?: string | null;
          is_read?: boolean;
          read_at?: string | null;
          created_at?: string;
        };
      };
      audit_logs: {
        Row: {
          id: string;
          actor_id: string | null;
          action: string;
          resource_type: string;
          resource_id: string;
          ip_address: string | null;
          old_values: Json | null;
          new_values: Json | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          actor_id?: string | null;
          action: string;
          resource_type: string;
          resource_id: string;
          ip_address?: string | null;
          old_values?: Json | null;
          new_values?: Json | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          actor_id?: string | null;
          action?: string;
          resource_type?: string;
          resource_id?: string;
          ip_address?: string | null;
          old_values?: Json | null;
          new_values?: Json | null;
          metadata?: Json;
          created_at?: string;
        };
      };
      ecosystem_actors: {
        Row: {
          id: string;
          user_id: string;
          business_profile_id: string | null;
          actor_type: string;
          display_name: string;
          description: string | null;
          capabilities: string[];
          state: string;
          lga: string;
          verification_status: "UNVERIFIED" | "SELF_DECLARED" | "VERIFIED" | "OFFICIAL";
          is_active: boolean;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          business_profile_id?: string | null;
          actor_type: string;
          display_name: string;
          description?: string | null;
          capabilities?: string[];
          state: string;
          lga: string;
          verification_status?: "UNVERIFIED" | "SELF_DECLARED" | "VERIFIED" | "OFFICIAL";
          is_active?: boolean;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          business_profile_id?: string | null;
          actor_type?: string;
          display_name?: string;
          description?: string | null;
          capabilities?: string[];
          state?: string;
          lga?: string;
          verification_status?: "UNVERIFIED" | "SELF_DECLARED" | "VERIFIED" | "OFFICIAL";
          is_active?: boolean;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      production_units: {
        Row: {
          id: string;
          owner_id: string;
          business_profile_id: string | null;
          name: string;
          unit_type: string;
          state: string;
          lga: string;
          general_area: string | null;
          commodities: string[];
          capacity_value: number | null;
          capacity_unit: string | null;
          status: "ACTIVE" | "INACTIVE" | "FALLOW" | "MAINTENANCE" | "DECOMMISSIONED";
          verification_status: "UNVERIFIED" | "SELF_DECLARED" | "VERIFIED" | "INSPECTED";
          is_public: boolean;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          business_profile_id?: string | null;
          name: string;
          unit_type: string;
          state: string;
          lga: string;
          general_area?: string | null;
          commodities?: string[];
          capacity_value?: number | null;
          capacity_unit?: string | null;
          status?: "ACTIVE" | "INACTIVE" | "FALLOW" | "MAINTENANCE" | "DECOMMISSIONED";
          verification_status?: "UNVERIFIED" | "SELF_DECLARED" | "VERIFIED" | "INSPECTED";
          is_public?: boolean;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          business_profile_id?: string | null;
          name?: string;
          unit_type?: string;
          state?: string;
          lga?: string;
          general_area?: string | null;
          commodities?: string[];
          capacity_value?: number | null;
          capacity_unit?: string | null;
          status?: "ACTIVE" | "INACTIVE" | "FALLOW" | "MAINTENANCE" | "DECOMMISSIONED";
          verification_status?: "UNVERIFIED" | "SELF_DECLARED" | "VERIFIED" | "INSPECTED";
          is_public?: boolean;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      production_outputs: {
        Row: {
          id: string;
          production_unit_id: string | null;
          producer_id: string;
          commodity_name: string;
          output_type: string;
          batch_number: string | null;
          quantity: number;
          unit: string;
          harvest_date: string;
          quality_grade: "STANDARD" | "PREMIUM" | "GRADE_A" | "GRADE_B" | "COMMERCIAL";
          status: "AVAILABLE" | "ALLOCATED" | "IN_TRANSIT" | "PROCESSED" | "DEPLETED";
          state: string;
          lga: string;
          notes: string | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          production_unit_id?: string | null;
          producer_id: string;
          commodity_name: string;
          output_type: string;
          batch_number?: string | null;
          quantity: number;
          unit: string;
          harvest_date?: string;
          quality_grade?: "STANDARD" | "PREMIUM" | "GRADE_A" | "GRADE_B" | "COMMERCIAL";
          status?: "AVAILABLE" | "ALLOCATED" | "IN_TRANSIT" | "PROCESSED" | "DEPLETED";
          state: string;
          lga: string;
          notes?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          production_unit_id?: string | null;
          producer_id?: string;
          commodity_name?: string;
          output_type?: string;
          batch_number?: string | null;
          quantity?: number;
          unit?: string;
          harvest_date?: string;
          quality_grade?: "STANDARD" | "PREMIUM" | "GRADE_A" | "GRADE_B" | "COMMERCIAL";
          status?: "AVAILABLE" | "ALLOCATED" | "IN_TRANSIT" | "PROCESSED" | "DEPLETED";
          state?: string;
          lga?: string;
          notes?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      aggregation_pools: {
        Row: {
          id: string;
          aggregator_id: string;
          title: string;
          commodity: string;
          target_quantity: number;
          current_quantity: number;
          unit: string;
          state: string;
          lga: string;
          collection_center_name: string | null;
          expected_availability_date: string;
          target_buyer_id: string | null;
          target_processor_id: string | null;
          status: "OPEN" | "AGGREGATING" | "FULFILLED" | "DISPATCHED" | "CANCELLED" | "CLOSED";
          notes: string | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          aggregator_id: string;
          title: string;
          commodity: string;
          target_quantity: number;
          current_quantity?: number;
          unit: string;
          state: string;
          lga: string;
          collection_center_name?: string | null;
          expected_availability_date: string;
          target_buyer_id?: string | null;
          target_processor_id?: string | null;
          status?: "OPEN" | "AGGREGATING" | "FULFILLED" | "DISPATCHED" | "CANCELLED" | "CLOSED";
          notes?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          aggregator_id?: string;
          title?: string;
          commodity?: string;
          target_quantity?: number;
          current_quantity?: number;
          unit?: string;
          state?: string;
          lga?: string;
          collection_center_name?: string | null;
          expected_availability_date?: string;
          target_buyer_id?: string | null;
          target_processor_id?: string | null;
          status?: "OPEN" | "AGGREGATING" | "FULFILLED" | "DISPATCHED" | "CANCELLED" | "CLOSED";
          notes?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      aggregation_pool_contributions: {
        Row: {
          id: string;
          pool_id: string;
          supplier_id: string;
          production_output_id: string | null;
          quantity: number;
          unit: string;
          status: "COMMITTED" | "DELIVERED" | "INSPECTED" | "REJECTED" | "SETTLED";
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          pool_id: string;
          supplier_id: string;
          production_output_id?: string | null;
          quantity: number;
          unit: string;
          status?: "COMMITTED" | "DELIVERED" | "INSPECTED" | "REJECTED" | "SETTLED";
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          pool_id?: string;
          supplier_id?: string;
          production_output_id?: string | null;
          quantity?: number;
          unit?: string;
          status?: "COMMITTED" | "DELIVERED" | "INSPECTED" | "REJECTED" | "SETTLED";
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      processing_facilities: {
        Row: {
          id: string;
          operator_id: string;
          business_profile_id: string | null;
          name: string;
          facility_type: string;
          services_offered: string[];
          processing_capacity_value: number | null;
          processing_capacity_unit: string | null;
          minimum_batch_size: number | null;
          supported_commodities: string[];
          state: string;
          lga: string;
          general_location: string | null;
          verification_status: "UNVERIFIED" | "SELF_DECLARED" | "VERIFIED" | "INSPECTED";
          is_active: boolean;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          operator_id: string;
          business_profile_id?: string | null;
          name: string;
          facility_type: string;
          services_offered?: string[];
          processing_capacity_value?: number | null;
          processing_capacity_unit?: string | null;
          minimum_batch_size?: number | null;
          supported_commodities?: string[];
          state: string;
          lga: string;
          general_location?: string | null;
          verification_status?: "UNVERIFIED" | "SELF_DECLARED" | "VERIFIED" | "INSPECTED";
          is_active?: boolean;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          operator_id?: string;
          business_profile_id?: string | null;
          name?: string;
          facility_type?: string;
          services_offered?: string[];
          processing_capacity_value?: number | null;
          processing_capacity_unit?: string | null;
          minimum_batch_size?: number | null;
          supported_commodities?: string[];
          state?: string;
          lga?: string;
          general_location?: string | null;
          verification_status?: "UNVERIFIED" | "SELF_DECLARED" | "VERIFIED" | "INSPECTED";
          is_active?: boolean;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      processing_events: {
        Row: {
          id: string;
          facility_id: string | null;
          processor_id: string;
          process_type: string;
          input_description: string;
          input_quantity: number;
          input_unit: string;
          input_source_output_id: string | null;
          output_description: string;
          output_quantity: number;
          output_unit: string;
          yield_percentage: number | null;
          batch_reference: string | null;
          started_at: string;
          completed_at: string | null;
          status: "IN_PROGRESS" | "COMPLETED" | "HALTED" | "REJECTED";
          resulting_output_id: string | null;
          resulting_listing_id: string | null;
          notes: string | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          facility_id?: string | null;
          processor_id: string;
          process_type: string;
          input_description: string;
          input_quantity: number;
          input_unit: string;
          input_source_output_id?: string | null;
          output_description: string;
          output_quantity: number;
          output_unit: string;
          yield_percentage?: number | null;
          batch_reference?: string | null;
          started_at?: string;
          completed_at?: string | null;
          status?: "IN_PROGRESS" | "COMPLETED" | "HALTED" | "REJECTED";
          resulting_output_id?: string | null;
          resulting_listing_id?: string | null;
          notes?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          facility_id?: string | null;
          processor_id?: string;
          process_type?: string;
          input_description?: string;
          input_quantity?: number;
          input_unit?: string;
          input_source_output_id?: string | null;
          output_description?: string;
          output_quantity?: number;
          output_unit?: string;
          yield_percentage?: number | null;
          batch_reference?: string | null;
          started_at?: string;
          completed_at?: string | null;
          status?: "IN_PROGRESS" | "COMPLETED" | "HALTED" | "REJECTED";
          resulting_output_id?: string | null;
          resulting_listing_id?: string | null;
          notes?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      value_chain_events: {
        Row: {
          id: string;
          event_type:
            | "PRODUCED"
            | "HARVESTED"
            | "AGGREGATED"
            | "TRANSPORTED"
            | "RECEIVED"
            | "PROCESSED"
            | "INSPECTED"
            | "PACKAGED"
            | "STORED"
            | "DISPATCHED"
            | "DELIVERED";
          entity_type:
            | "PRODUCTION_OUTPUT"
            | "AGGREGATION_POOL"
            | "PROCESSING_EVENT"
            | "B2B_DEMAND"
            | "MARKETPLACE_LISTING";
          entity_id: string;
          actor_id: string;
          event_title: string;
          event_details: Json;
          state: string;
          lga: string | null;
          occurred_at: string;
          recorded_at: string;
        };
        Insert: {
          id?: string;
          event_type:
            | "PRODUCED"
            | "HARVESTED"
            | "AGGREGATED"
            | "TRANSPORTED"
            | "RECEIVED"
            | "PROCESSED"
            | "INSPECTED"
            | "PACKAGED"
            | "STORED"
            | "DISPATCHED"
            | "DELIVERED";
          entity_type:
            | "PRODUCTION_OUTPUT"
            | "AGGREGATION_POOL"
            | "PROCESSING_EVENT"
            | "B2B_DEMAND"
            | "MARKETPLACE_LISTING";
          entity_id: string;
          actor_id: string;
          event_title: string;
          event_details?: Json;
          state: string;
          lga?: string | null;
          occurred_at?: string;
          recorded_at?: string;
        };
        Update: {
          id?: string;
          event_type?:
            | "PRODUCED"
            | "HARVESTED"
            | "AGGREGATED"
            | "TRANSPORTED"
            | "RECEIVED"
            | "PROCESSED"
            | "INSPECTED"
            | "PACKAGED"
            | "STORED"
            | "DISPATCHED"
            | "DELIVERED";
          entity_type?:
            | "PRODUCTION_OUTPUT"
            | "AGGREGATION_POOL"
            | "PROCESSING_EVENT"
            | "B2B_DEMAND"
            | "MARKETPLACE_LISTING";
          entity_id?: string;
          actor_id?: string;
          event_title?: string;
          event_details?: Json;
          state?: string;
          lga?: string | null;
          occurred_at?: string;
          recorded_at?: string;
        };
      };
      b2b_demands: {
        Row: {
          id: string;
          buyer_id: string;
          business_profile_id: string | null;
          title: string;
          commodity_or_product: string;
          quantity: number;
          unit: string;
          specifications: Json;
          target_price_per_unit: number | null;
          state: string;
          lga: string;
          desired_delivery_date: string;
          frequency: "ONE_TIME" | "DAILY" | "WEEKLY" | "BI_WEEKLY" | "MONTHLY" | "QUARTERLY";
          status: "ACTIVE" | "MATCHED" | "PARTIALLY_MATCHED" | "FULFILLED" | "EXPIRED" | "CANCELLED";
          notes: string | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          buyer_id: string;
          business_profile_id?: string | null;
          title: string;
          commodity_or_product: string;
          quantity: number;
          unit: string;
          specifications?: Json;
          target_price_per_unit?: number | null;
          state: string;
          lga: string;
          desired_delivery_date: string;
          frequency?: "ONE_TIME" | "DAILY" | "WEEKLY" | "BI_WEEKLY" | "MONTHLY" | "QUARTERLY";
          status?: "ACTIVE" | "MATCHED" | "PARTIALLY_MATCHED" | "FULFILLED" | "EXPIRED" | "CANCELLED";
          notes?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          buyer_id?: string;
          business_profile_id?: string | null;
          title?: string;
          commodity_or_product?: string;
          quantity?: number;
          unit?: string;
          specifications?: Json;
          target_price_per_unit?: number | null;
          state?: string;
          lga?: string;
          desired_delivery_date?: string;
          frequency?: "ONE_TIME" | "DAILY" | "WEEKLY" | "BI_WEEKLY" | "MONTHLY" | "QUARTERLY";
          status?: "ACTIVE" | "MATCHED" | "PARTIALLY_MATCHED" | "FULFILLED" | "EXPIRED" | "CANCELLED";
          notes?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
}
