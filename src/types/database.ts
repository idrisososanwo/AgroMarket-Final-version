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
      agricultural_intelligence_agents: {
        Row: {
          id: string;
          name: string;
          version: string;
          description: string;
          capabilities: string[];
          status: "ACTIVE" | "MAINTENANCE" | "DEPRECATED";
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          name: string;
          version?: string;
          description: string;
          capabilities?: string[];
          status?: "ACTIVE" | "MAINTENANCE" | "DEPRECATED";
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          version?: string;
          description?: string;
          capabilities?: string[];
          status?: "ACTIVE" | "MAINTENANCE" | "DEPRECATED";
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      agricultural_intelligence_observations: {
        Row: {
          id: string;
          agent_id: string;
          domain_source: "MARKET" | "SUPPLY" | "DEMAND" | "PROCESSING" | "LOGISTICS" | "SECURITY" | "KNOWLEDGE" | "EQUIPMENT" | "VALUE_CHAIN";
          source_id: string | null;
          commodity: string | null;
          category: string | null;
          state: string | null;
          lga: string | null;
          corridor: string | null;
          summary: string;
          details: Json;
          observed_value: number | null;
          baseline_value: number | null;
          unit: string | null;
          confidence: number;
          evidence: Json;
          observed_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          agent_id: string;
          domain_source: "MARKET" | "SUPPLY" | "DEMAND" | "PROCESSING" | "LOGISTICS" | "SECURITY" | "KNOWLEDGE" | "EQUIPMENT" | "VALUE_CHAIN";
          source_id?: string | null;
          commodity?: string | null;
          category?: string | null;
          state?: string | null;
          lga?: string | null;
          corridor?: string | null;
          summary: string;
          details?: Json;
          observed_value?: number | null;
          baseline_value?: number | null;
          unit?: string | null;
          confidence: number;
          evidence?: Json;
          observed_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          agent_id?: string;
          domain_source?: "MARKET" | "SUPPLY" | "DEMAND" | "PROCESSING" | "LOGISTICS" | "SECURITY" | "KNOWLEDGE" | "EQUIPMENT" | "VALUE_CHAIN";
          source_id?: string | null;
          commodity?: string | null;
          category?: string | null;
          state?: string | null;
          lga?: string | null;
          corridor?: string | null;
          summary?: string;
          details?: Json;
          observed_value?: number | null;
          baseline_value?: number | null;
          unit?: string | null;
          confidence?: number;
          evidence?: Json;
          observed_at?: string;
          created_at?: string;
        };
      };
      agricultural_intelligence_signals: {
        Row: {
          id: string;
          agent_id: string;
          signal_type: "PRICE_INCREASE" | "PRICE_DECREASE" | "DEMAND_INCREASE" | "DEMAND_DECREASE" | "SUPPLY_SHORTAGE" | "SUPPLY_SURPLUS" | "PROCESSING_BOTTLENECK" | "LOGISTICS_DISRUPTION" | "SECURITY_DISRUPTION" | "DISEASE_RISK" | "SEASONAL_DEMAND";
          commodity: string;
          category: string | null;
          state: string;
          lga: string | null;
          corridor: string | null;
          magnitude: number;
          confidence: number;
          source: string;
          evidence: Json;
          supporting_observation_ids: string[];
          observed_at: string;
          expires_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          agent_id: string;
          signal_type: "PRICE_INCREASE" | "PRICE_DECREASE" | "DEMAND_INCREASE" | "DEMAND_DECREASE" | "SUPPLY_SHORTAGE" | "SUPPLY_SURPLUS" | "PROCESSING_BOTTLENECK" | "LOGISTICS_DISRUPTION" | "SECURITY_DISRUPTION" | "DISEASE_RISK" | "SEASONAL_DEMAND";
          commodity: string;
          category?: string | null;
          state: string;
          lga?: string | null;
          corridor?: string | null;
          magnitude: number;
          confidence: number;
          source: string;
          evidence?: Json;
          supporting_observation_ids?: string[];
          observed_at?: string;
          expires_at: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          agent_id?: string;
          signal_type?: "PRICE_INCREASE" | "PRICE_DECREASE" | "DEMAND_INCREASE" | "DEMAND_DECREASE" | "SUPPLY_SHORTAGE" | "SUPPLY_SURPLUS" | "PROCESSING_BOTTLENECK" | "LOGISTICS_DISRUPTION" | "SECURITY_DISRUPTION" | "DISEASE_RISK" | "SEASONAL_DEMAND";
          commodity?: string;
          category?: string | null;
          state?: string;
          lga?: string | null;
          corridor?: string | null;
          magnitude?: number;
          confidence?: number;
          source?: string;
          evidence?: Json;
          supporting_observation_ids?: string[];
          observed_at?: string;
          expires_at?: string;
          created_at?: string;
        };
      };
      agricultural_intelligence_recommendations: {
        Row: {
          id: string;
          agent_id: string;
          objective: "STABILIZE_SUPPLY" | "PREVENT_SPOILAGE" | "OPTIMIZE_PRICING" | "REROUTE_LOGISTICS" | "RISK_MITIGATION" | "FACILITY_OFFTAKE" | "DEMAND_FULFILLMENT" | "SECURITY_ADVISORY";
          title: string;
          recommendation: string;
          evidence: Json;
          confidence: number;
          expected_impact: Json;
          affected_actors: string[];
          affected_commodities: string[];
          affected_locations: string[];
          status: "PROPOSED" | "REVIEWED" | "APPROVED" | "REJECTED" | "EXECUTED" | "EXPIRED";
          reviewed_by: string | null;
          reviewed_at: string | null;
          review_decision: "APPROVED" | "REJECTED" | "DEFERRED" | null;
          review_notes: string | null;
          executed_at: string | null;
          execution_notes: string | null;
          expires_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          agent_id: string;
          objective: "STABILIZE_SUPPLY" | "PREVENT_SPOILAGE" | "OPTIMIZE_PRICING" | "REROUTE_LOGISTICS" | "RISK_MITIGATION" | "FACILITY_OFFTAKE" | "DEMAND_FULFILLMENT" | "SECURITY_ADVISORY";
          title: string;
          recommendation: string;
          evidence?: Json;
          confidence: number;
          expected_impact?: Json;
          affected_actors?: string[];
          affected_commodities?: string[];
          affected_locations?: string[];
          status?: "PROPOSED" | "REVIEWED" | "APPROVED" | "REJECTED" | "EXECUTED" | "EXPIRED";
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          review_decision?: "APPROVED" | "REJECTED" | "DEFERRED" | null;
          review_notes?: string | null;
          executed_at?: string | null;
          execution_notes?: string | null;
          expires_at: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          agent_id?: string;
          objective?: "STABILIZE_SUPPLY" | "PREVENT_SPOILAGE" | "OPTIMIZE_PRICING" | "REROUTE_LOGISTICS" | "RISK_MITIGATION" | "FACILITY_OFFTAKE" | "DEMAND_FULFILLMENT" | "SECURITY_ADVISORY";
          title?: string;
          recommendation?: string;
          evidence?: Json;
          confidence?: number;
          expected_impact?: Json;
          affected_actors?: string[];
          affected_commodities?: string[];
          affected_locations?: string[];
          status?: "PROPOSED" | "REVIEWED" | "APPROVED" | "REJECTED" | "EXECUTED" | "EXPIRED";
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          review_decision?: "APPROVED" | "REJECTED" | "DEFERRED" | null;
          review_notes?: string | null;
          executed_at?: string | null;
          execution_notes?: string | null;
          expires_at?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      agricultural_intelligence_predictions: {
        Row: {
          id: string;
          agent_id: string;
          recommendation_id: string | null;
          commodity: string;
          state: string;
          lga: string | null;
          metric_name: string;
          baseline_value: number;
          predicted_value: number;
          predicted_range_low: number | null;
          predicted_range_high: number | null;
          confidence: number;
          target_date: string;
          status: "PENDING" | "EVALUATED" | "CANCELLED" | "EXPIRED";
          created_at: string;
        };
        Insert: {
          id?: string;
          agent_id: string;
          recommendation_id?: string | null;
          commodity: string;
          state: string;
          lga?: string | null;
          metric_name: string;
          baseline_value: number;
          predicted_value: number;
          predicted_range_low?: number | null;
          predicted_range_high?: number | null;
          confidence: number;
          target_date: string;
          status?: "PENDING" | "EVALUATED" | "CANCELLED" | "EXPIRED";
          created_at?: string;
        };
        Update: {
          id?: string;
          agent_id?: string;
          recommendation_id?: string | null;
          commodity?: string;
          state?: string;
          lga?: string | null;
          metric_name?: string;
          baseline_value?: number;
          predicted_value?: number;
          predicted_range_low?: number | null;
          predicted_range_high?: number | null;
          confidence?: number;
          target_date?: string;
          status?: "PENDING" | "EVALUATED" | "CANCELLED" | "EXPIRED";
          created_at?: string;
        };
      };
      agricultural_intelligence_outcomes: {
        Row: {
          id: string;
          prediction_id: string;
          actual_value: number;
          observed_at: string;
          source_domain: string;
          source_id: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          prediction_id: string;
          actual_value: number;
          observed_at?: string;
          source_domain: string;
          source_id?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          prediction_id?: string;
          actual_value?: number;
          observed_at?: string;
          source_domain?: string;
          source_id?: string | null;
          notes?: string | null;
          created_at?: string;
        };
      };
      agricultural_intelligence_evaluations: {
        Row: {
          id: string;
          prediction_id: string;
          outcome_id: string;
          predicted_value: number;
          actual_value: number;
          absolute_error: number;
          percentage_error: number;
          direction_accurate: boolean;
          within_predicted_range: boolean;
          evaluation_score: number;
          evaluated_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          prediction_id: string;
          outcome_id: string;
          predicted_value: number;
          actual_value: number;
          absolute_error: number;
          percentage_error: number;
          direction_accurate: boolean;
          within_predicted_range: boolean;
          evaluation_score: number;
          evaluated_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          prediction_id?: string;
          outcome_id?: string;
          predicted_value?: number;
          actual_value?: number;
          absolute_error?: number;
          percentage_error?: number;
          direction_accurate?: boolean;
          within_predicted_range?: boolean;
          evaluation_score?: number;
          evaluated_at?: string;
          created_at?: string;
        };
      };
      ai_reasoning_runs: {
        Row: {
          id: string;
          agent_id: string;
          objective:
            | "MARKET_INTERPRETATION"
            | "SUPPLY_DEMAND_ANALYSIS"
            | "FOOD_SECURITY_ASSESSMENT"
            | "LOGISTICS_IMPACT_ASSESSMENT"
            | "SECURITY_IMPACT_ASSESSMENT"
            | "PRODUCTION_SIGNAL_INTERPRETATION"
            | "PROCESSING_BOTTLENECK_ANALYSIS"
            | "GENERAL_AGRICULTURAL_INTELLIGENCE";
          commodity: string;
          state: string;
          lga: string | null;
          corridor: string | null;
          provider: string;
          model: string;
          prompt_tokens: number;
          completion_tokens: number;
          latency_ms: number;
          status:
            | "PENDING"
            | "COMPLETED"
            | "FAILED"
            | "REJECTED_SAFETY"
            | "REJECTED_VALIDATION"
            | "PROVIDER_UNAVAILABLE";
          error_message: string | null;
          requested_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          agent_id: string;
          objective:
            | "MARKET_INTERPRETATION"
            | "SUPPLY_DEMAND_ANALYSIS"
            | "FOOD_SECURITY_ASSESSMENT"
            | "LOGISTICS_IMPACT_ASSESSMENT"
            | "SECURITY_IMPACT_ASSESSMENT"
            | "PRODUCTION_SIGNAL_INTERPRETATION"
            | "PROCESSING_BOTTLENECK_ANALYSIS"
            | "GENERAL_AGRICULTURAL_INTELLIGENCE";
          commodity: string;
          state: string;
          lga?: string | null;
          corridor?: string | null;
          provider: string;
          model: string;
          prompt_tokens?: number;
          completion_tokens?: number;
          latency_ms?: number;
          status?:
            | "PENDING"
            | "COMPLETED"
            | "FAILED"
            | "REJECTED_SAFETY"
            | "REJECTED_VALIDATION"
            | "PROVIDER_UNAVAILABLE";
          error_message?: string | null;
          requested_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          agent_id?: string;
          objective?:
            | "MARKET_INTERPRETATION"
            | "SUPPLY_DEMAND_ANALYSIS"
            | "FOOD_SECURITY_ASSESSMENT"
            | "LOGISTICS_IMPACT_ASSESSMENT"
            | "SECURITY_IMPACT_ASSESSMENT"
            | "PRODUCTION_SIGNAL_INTERPRETATION"
            | "PROCESSING_BOTTLENECK_ANALYSIS"
            | "GENERAL_AGRICULTURAL_INTELLIGENCE";
          commodity?: string;
          state?: string;
          lga?: string | null;
          corridor?: string | null;
          provider?: string;
          model?: string;
          prompt_tokens?: number;
          completion_tokens?: number;
          latency_ms?: number;
          status?:
            | "PENDING"
            | "COMPLETED"
            | "FAILED"
            | "REJECTED_SAFETY"
            | "REJECTED_VALIDATION"
            | "PROVIDER_UNAVAILABLE";
          error_message?: string | null;
          requested_by?: string | null;
          created_at?: string;
        };
      };
      ai_reasoning_outputs: {
        Row: {
          id: string;
          run_id: string;
          summary: string;
          interpretation: string;
          key_findings: Json;
          supporting_evidence: Json;
          uncertainty: string;
          model_confidence: number;
          evidence_confidence: number;
          recommendation_title: string | null;
          recommendation_text: string | null;
          expected_impact: Json;
          affected_actors: string[];
          affected_commodities: string[];
          affected_locations: string[];
          limitations: string[];
          safety_notes: string[];
          generated_recommendation_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          run_id: string;
          summary: string;
          interpretation: string;
          key_findings?: Json;
          supporting_evidence?: Json;
          uncertainty: string;
          model_confidence: number;
          evidence_confidence: number;
          recommendation_title?: string | null;
          recommendation_text?: string | null;
          expected_impact?: Json;
          affected_actors?: string[];
          affected_commodities?: string[];
          affected_locations?: string[];
          limitations?: string[];
          safety_notes?: string[];
          generated_recommendation_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          run_id?: string;
          summary?: string;
          interpretation?: string;
          key_findings?: Json;
          supporting_evidence?: Json;
          uncertainty?: string;
          model_confidence?: number;
          evidence_confidence?: number;
          recommendation_title?: string | null;
          recommendation_text?: string | null;
          expected_impact?: Json;
          affected_actors?: string[];
          affected_commodities?: string[];
          affected_locations?: string[];
          limitations?: string[];
          safety_notes?: string[];
          generated_recommendation_id?: string | null;
          created_at?: string;
        };
      };
      ai_reasoning_audits: {
        Row: {
          id: string;
          run_id: string;
          event_type:
            | "REQUEST_INITIATED"
            | "PRE_CHECK_PASSED"
            | "PRE_CHECK_FAILED"
            | "GATEWAY_DISPATCH"
            | "PROVIDER_RESPONSE"
            | "POST_CHECK_PASSED"
            | "POST_CHECK_FAILED"
            | "RECOMMENDATION_PROPOSED"
            | "FAILURE_CAPTURED";
          actor_id: string | null;
          details: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          run_id: string;
          event_type:
            | "REQUEST_INITIATED"
            | "PRE_CHECK_PASSED"
            | "PRE_CHECK_FAILED"
            | "GATEWAY_DISPATCH"
            | "PROVIDER_RESPONSE"
            | "POST_CHECK_PASSED"
            | "POST_CHECK_FAILED"
            | "RECOMMENDATION_PROPOSED"
            | "FAILURE_CAPTURED";
          actor_id?: string | null;
          details?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          run_id?: string;
          event_type?:
            | "REQUEST_INITIATED"
            | "PRE_CHECK_PASSED"
            | "PRE_CHECK_FAILED"
            | "GATEWAY_DISPATCH"
            | "PROVIDER_RESPONSE"
            | "POST_CHECK_PASSED"
            | "POST_CHECK_FAILED"
            | "RECOMMENDATION_PROPOSED"
            | "FAILURE_CAPTURED";
          actor_id?: string | null;
          details?: Json;
          created_at?: string;
        };
      };
      market_pressure_snapshots: {
        Row: {
          id: string;
          commodity: string;
          state: string;
          pressure_score: number;
          pressure_level: "LOW" | "MODERATE" | "ELEVATED" | "ACUTE" | "CRITICAL";
          price_pressure: number;
          supply_pressure: number;
          demand_pressure: number;
          disruption_pressure: number;
          confidence: number;
          drivers: string[];
          risks: string[];
          evidence_count: number;
          metadata: Json;
          calculated_at: string;
        };
        Insert: {
          id?: string;
          commodity: string;
          state: string;
          pressure_score: number;
          pressure_level: "LOW" | "MODERATE" | "ELEVATED" | "ACUTE" | "CRITICAL";
          price_pressure?: number;
          supply_pressure?: number;
          demand_pressure?: number;
          disruption_pressure?: number;
          confidence?: number;
          drivers?: string[];
          risks?: string[];
          evidence_count?: number;
          metadata?: Json;
          calculated_at?: string;
        };
        Update: {
          id?: string;
          commodity?: string;
          state?: string;
          pressure_score?: number;
          pressure_level?: "LOW" | "MODERATE" | "ELEVATED" | "ACUTE" | "CRITICAL";
          price_pressure?: number;
          supply_pressure?: number;
          demand_pressure?: number;
          disruption_pressure?: number;
          confidence?: number;
          drivers?: string[];
          risks?: string[];
          evidence_count?: number;
          metadata?: Json;
          calculated_at?: string;
        };
      };
      production_planning_snapshots: {
        Row: {
          id: string;
          commodity: string;
          state: string;
          domain: "CROPS" | "LIVESTOCK" | "POULTRY" | "AQUACULTURE" | "MIXED";
          opportunity_score: number;
          risk_score: number;
          opportunity_level: "LOW" | "MODERATE" | "ATTRACTIVE" | "HIGH_OPPORTUNITY";
          risk_level: "LOW" | "MODERATE" | "ELEVATED" | "HIGH_RISK";
          market_demand_status: string;
          supply_balance_status: string;
          seasonal_alignment: "PEAK_WINDOW" | "ACTIVE_SEASON" | "OFF_SEASON" | "INSUFFICIENT_DATA";
          input_constraint_level: "NONE" | "MODERATE" | "SEVERE" | "INSUFFICIENT_DATA";
          processing_constraint_level: "NONE" | "MODERATE" | "BOTTLENECK" | "INSUFFICIENT_DATA";
          confidence: number;
          opportunities: string[];
          risks: string[];
          constraints: string[];
          evidence_count: number;
          metadata: Json;
          calculated_at: string;
        };
        Insert: {
          id?: string;
          commodity: string;
          state: string;
          domain?: "CROPS" | "LIVESTOCK" | "POULTRY" | "AQUACULTURE" | "MIXED";
          opportunity_score: number;
          risk_score: number;
          opportunity_level: "LOW" | "MODERATE" | "ATTRACTIVE" | "HIGH_OPPORTUNITY";
          risk_level: "LOW" | "MODERATE" | "ELEVATED" | "HIGH_RISK";
          market_demand_status: string;
          supply_balance_status: string;
          seasonal_alignment?: "PEAK_WINDOW" | "ACTIVE_SEASON" | "OFF_SEASON" | "INSUFFICIENT_DATA";
          input_constraint_level?: "NONE" | "MODERATE" | "SEVERE" | "INSUFFICIENT_DATA";
          processing_constraint_level?: "NONE" | "MODERATE" | "BOTTLENECK" | "INSUFFICIENT_DATA";
          confidence?: number;
          opportunities?: string[];
          risks?: string[];
          constraints?: string[];
          evidence_count?: number;
          metadata?: Json;
          calculated_at?: string;
        };
        Update: {
          id?: string;
          commodity?: string;
          state?: string;
          domain?: "CROPS" | "LIVESTOCK" | "POULTRY" | "AQUACULTURE" | "MIXED";
          opportunity_score?: number;
          risk_score?: number;
          opportunity_level?: "LOW" | "MODERATE" | "ATTRACTIVE" | "HIGH_OPPORTUNITY";
          risk_level?: "LOW" | "MODERATE" | "ELEVATED" | "HIGH_RISK";
          market_demand_status?: string;
          supply_balance_status?: string;
          seasonal_alignment?: "PEAK_WINDOW" | "ACTIVE_SEASON" | "OFF_SEASON" | "INSUFFICIENT_DATA";
          input_constraint_level?: "NONE" | "MODERATE" | "SEVERE" | "INSUFFICIENT_DATA";
          processing_constraint_level?: "NONE" | "MODERATE" | "BOTTLENECK" | "INSUFFICIENT_DATA";
          confidence?: number;
          opportunities?: string[];
          risks?: string[];
          constraints?: string[];
          evidence_count?: number;
          metadata?: Json;
          calculated_at?: string;
        };
      };
      demand_intelligence_snapshots: {
        Row: {
          id: string;
          commodity: string;
          state: string;
          demand_pressure_score: number;
          demand_pressure_level: "LOW" | "MODERATE" | "ELEVATED" | "ACUTE" | "CRITICAL";
          forecast_direction: "SHARP_INCREASE" | "MODERATE_INCREASE" | "STABLE" | "MODERATE_DECREASE" | "SHARP_DECREASE" | "INSUFFICIENT_DATA";
          forecast_confidence: number;
          forecast_horizon_days: number;
          predicted_demand_volume: number;
          volume_unit: string;
          b2b_demand_volume: number;
          consumer_orders_count: number;
          consumer_orders_volume: number;
          shared_purchase_demand_volume: number;
          volatility_level: "LOW" | "MODERATE" | "HIGH" | "INSUFFICIENT_DATA";
          unmet_demand_detected: boolean;
          demand_concentration: string;
          confidence: number;
          drivers: string[];
          risks: string[];
          evidence_count: number;
          metadata: Json;
          calculated_at: string;
        };
        Insert: {
          id?: string;
          commodity: string;
          state: string;
          demand_pressure_score: number;
          demand_pressure_level: "LOW" | "MODERATE" | "ELEVATED" | "ACUTE" | "CRITICAL";
          forecast_direction: "SHARP_INCREASE" | "MODERATE_INCREASE" | "STABLE" | "MODERATE_DECREASE" | "SHARP_DECREASE" | "INSUFFICIENT_DATA";
          forecast_confidence: number;
          forecast_horizon_days?: number;
          predicted_demand_volume?: number;
          volume_unit?: string;
          b2b_demand_volume?: number;
          consumer_orders_count?: number;
          consumer_orders_volume?: number;
          shared_purchase_demand_volume?: number;
          volatility_level: "LOW" | "MODERATE" | "HIGH" | "INSUFFICIENT_DATA";
          unmet_demand_detected?: boolean;
          demand_concentration?: string;
          confidence?: number;
          drivers?: string[];
          risks?: string[];
          evidence_count?: number;
          metadata?: Json;
          calculated_at?: string;
        };
        Update: {
          id?: string;
          commodity?: string;
          state?: string;
          demand_pressure_score?: number;
          demand_pressure_level?: "LOW" | "MODERATE" | "ELEVATED" | "ACUTE" | "CRITICAL";
          forecast_direction?: "SHARP_INCREASE" | "MODERATE_INCREASE" | "STABLE" | "MODERATE_DECREASE" | "SHARP_DECREASE" | "INSUFFICIENT_DATA";
          forecast_confidence?: number;
          forecast_horizon_days?: number;
          predicted_demand_volume?: number;
          volume_unit?: string;
          b2b_demand_volume?: number;
          consumer_orders_count?: number;
          consumer_orders_volume?: number;
          shared_purchase_demand_volume?: number;
          volatility_level?: "LOW" | "MODERATE" | "HIGH" | "INSUFFICIENT_DATA";
          unmet_demand_detected?: boolean;
          demand_concentration?: string;
          confidence?: number;
          drivers?: string[];
          risks?: string[];
          evidence_count?: number;
          metadata?: Json;
          calculated_at?: string;
        };
      };
      supply_matching_snapshots: {
        Row: {
          id: string;
          demand_id: string | null;
          commodity: string;
          state: string;
          lga: string | null;
          target_quantity: number;
          matched_quantity: number;
          remaining_gap: number;
          unit: string;
          fulfillment_percentage: number;
          match_classification: "EXCELLENT_MATCH" | "GOOD_MATCH" | "PARTIAL_MATCH" | "LOW_CONFIDENCE_MATCH" | "NO_MATCH" | "INSUFFICIENT_DATA";
          coordination_type: "DIRECT_SINGLE_SOURCE" | "MULTI_SOURCE_AGGREGATION" | "PROCESSING_REQUIRED" | "CROSS_CORRIDOR" | "UNSATISFIED" | "INSUFFICIENT_DATA";
          match_score: number;
          component_scores: Json;
          candidates_count: number;
          aggregation_pool_count: number;
          processing_required: boolean;
          processing_facility_id: string | null;
          logistics_corridor: string | null;
          constraints: string[];
          missing_evidence: string[];
          confidence: number;
          metadata: Json;
          calculated_at: string;
        };
        Insert: {
          id?: string;
          demand_id?: string | null;
          commodity: string;
          state: string;
          lga?: string | null;
          target_quantity?: number;
          matched_quantity?: number;
          remaining_gap?: number;
          unit?: string;
          fulfillment_percentage?: number;
          match_classification: "EXCELLENT_MATCH" | "GOOD_MATCH" | "PARTIAL_MATCH" | "LOW_CONFIDENCE_MATCH" | "NO_MATCH" | "INSUFFICIENT_DATA";
          coordination_type: "DIRECT_SINGLE_SOURCE" | "MULTI_SOURCE_AGGREGATION" | "PROCESSING_REQUIRED" | "CROSS_CORRIDOR" | "UNSATISFIED" | "INSUFFICIENT_DATA";
          match_score: number;
          component_scores?: Json;
          candidates_count?: number;
          aggregation_pool_count?: number;
          processing_required?: boolean;
          processing_facility_id?: string | null;
          logistics_corridor?: string | null;
          constraints?: string[];
          missing_evidence?: string[];
          confidence: number;
          metadata?: Json;
          calculated_at?: string;
        };
        Update: {
          id?: string;
          demand_id?: string | null;
          commodity?: string;
          state?: string;
          lga?: string | null;
          target_quantity?: number;
          matched_quantity?: number;
          remaining_gap?: number;
          unit?: string;
          fulfillment_percentage?: number;
          match_classification?: "EXCELLENT_MATCH" | "GOOD_MATCH" | "PARTIAL_MATCH" | "LOW_CONFIDENCE_MATCH" | "NO_MATCH" | "INSUFFICIENT_DATA";
          coordination_type?: "DIRECT_SINGLE_SOURCE" | "MULTI_SOURCE_AGGREGATION" | "PROCESSING_REQUIRED" | "CROSS_CORRIDOR" | "UNSATISFIED" | "INSUFFICIENT_DATA";
          match_score?: number;
          component_scores?: Json;
          candidates_count?: number;
          aggregation_pool_count?: number;
          processing_required?: boolean;
          processing_facility_id?: string | null;
          logistics_corridor?: string | null;
          constraints?: string[];
          missing_evidence?: string[];
          confidence?: number;
          metadata?: Json;
          calculated_at?: string;
        };
      };
      supply_match_candidates: {
        Row: {
          id: string;
          snapshot_id: string;
          supply_id: string;
          supply_source_type: "LISTING" | "INVENTORY" | "PRODUCTION_OUTPUT" | "AGGREGATION_POOL" | "PROCESSING_OUTPUT" | "EXPECTED_PRODUCTION";
          supplier_name: string;
          state: string;
          lga: string | null;
          available_quantity: number;
          allocated_quantity: number;
          unit: string;
          candidate_score: number;
          reliability_level: "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN";
          ready_date: string | null;
          verification_status: string;
          distance_tier: "SAME_LGA" | "SAME_STATE" | "REGIONAL_CORRIDOR" | "NATIONAL";
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          snapshot_id: string;
          supply_id: string;
          supply_source_type: "LISTING" | "INVENTORY" | "PRODUCTION_OUTPUT" | "AGGREGATION_POOL" | "PROCESSING_OUTPUT" | "EXPECTED_PRODUCTION";
          supplier_name: string;
          state: string;
          lga?: string | null;
          available_quantity: number;
          allocated_quantity?: number;
          unit?: string;
          candidate_score: number;
          reliability_level?: "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN";
          ready_date?: string | null;
          verification_status?: string;
          distance_tier: "SAME_LGA" | "SAME_STATE" | "REGIONAL_CORRIDOR" | "NATIONAL";
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          snapshot_id?: string;
          supply_id?: string;
          supply_source_type?: "LISTING" | "INVENTORY" | "PRODUCTION_OUTPUT" | "AGGREGATION_POOL" | "PROCESSING_OUTPUT" | "EXPECTED_PRODUCTION";
          supplier_name?: string;
          state?: string;
          lga?: string | null;
          available_quantity?: number;
          allocated_quantity?: number;
          unit?: string;
          candidate_score?: number;
          reliability_level?: "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN";
          ready_date?: string | null;
          verification_status?: string;
          distance_tier?: "SAME_LGA" | "SAME_STATE" | "REGIONAL_CORRIDOR" | "NATIONAL";
          metadata?: Json;
          created_at?: string;
        };
      };
      supply_coordination_recommendations: {
        Row: {
          id: string;
          snapshot_id: string;
          demand_id: string | null;
          recommendation_type: "AGGREGATE_FARMERS" | "CONNECT_DIRECT_SUPPLY" | "ROUTE_THROUGH_PROCESSOR" | "EXPLORE_ALTERNATIVE_CORRIDOR" | "RESOLVE_LOGISTICS_CONSTRAINT" | "EXPAND_SUPPLY_BASE";
          title: string;
          details: string;
          confidence: number;
          status: "PROPOSED" | "REVIEWED" | "ACCEPTED" | "REJECTED" | "ACTIONED" | "COMPLETED";
          actioned_by: string | null;
          actioned_at: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          snapshot_id: string;
          demand_id?: string | null;
          recommendation_type: "AGGREGATE_FARMERS" | "CONNECT_DIRECT_SUPPLY" | "ROUTE_THROUGH_PROCESSOR" | "EXPLORE_ALTERNATIVE_CORRIDOR" | "RESOLVE_LOGISTICS_CONSTRAINT" | "EXPAND_SUPPLY_BASE";
          title: string;
          details: string;
          confidence: number;
          status?: "PROPOSED" | "REVIEWED" | "ACCEPTED" | "REJECTED" | "ACTIONED" | "COMPLETED";
          actioned_by?: string | null;
          actioned_at?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          snapshot_id?: string;
          demand_id?: string | null;
          recommendation_type?: "AGGREGATE_FARMERS" | "CONNECT_DIRECT_SUPPLY" | "ROUTE_THROUGH_PROCESSOR" | "EXPLORE_ALTERNATIVE_CORRIDOR" | "RESOLVE_LOGISTICS_CONSTRAINT" | "EXPAND_SUPPLY_BASE";
          title?: string;
          details?: string;
          confidence?: number;
          status?: "PROPOSED" | "REVIEWED" | "ACCEPTED" | "REJECTED" | "ACTIONED" | "COMPLETED";
          actioned_by?: string | null;
          actioned_at?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      procurement_intelligence_snapshots: {
        Row: {
          id: string;
          demand_id: string | null;
          buyer_id: string | null;
          commodity: string;
          state: string;
          lga: string | null;
          target_quantity: number;
          matched_quantity: number;
          supply_gap: number;
          unit: string;
          fulfillment_percentage: number;
          procurement_priority_score: number;
          priority_components: Json;
          recommended_strategy: "DIRECT_SUPPLIER" | "MULTI_SUPPLIER" | "AGGREGATED_PROCUREMENT" | "PROCESSING_REQUIRED" | "REGIONAL_ALTERNATIVE" | "WAIT_AND_MONITOR" | "INSUFFICIENT_DATA";
          procurement_risk_level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | "UNKNOWN";
          risk_factors: string[];
          opportunity_status: "OPEN" | "PARTIALLY_SOURCED" | "SOURCED" | "CONSTRAINED" | "EXPIRED" | "CANCELLED" | "COMPLETED";
          candidate_suppliers_count: number;
          supplier_concentration_detected: boolean;
          concentration_ratio: number | null;
          market_pressure_level: string | null;
          observed_price_min: number | null;
          observed_price_max: number | null;
          observed_price_median: number | null;
          price_trend: string | null;
          estimated_procurement_cost: number | null;
          processing_required: boolean;
          security_disruption_flag: boolean;
          constraints: string[];
          missing_evidence: string[];
          confidence: number;
          metadata: Json;
          calculated_at: string;
        };
        Insert: {
          id?: string;
          demand_id?: string | null;
          buyer_id?: string | null;
          commodity: string;
          state: string;
          lga?: string | null;
          target_quantity?: number;
          matched_quantity?: number;
          supply_gap?: number;
          unit?: string;
          fulfillment_percentage?: number;
          procurement_priority_score: number;
          priority_components?: Json;
          recommended_strategy: "DIRECT_SUPPLIER" | "MULTI_SUPPLIER" | "AGGREGATED_PROCUREMENT" | "PROCESSING_REQUIRED" | "REGIONAL_ALTERNATIVE" | "WAIT_AND_MONITOR" | "INSUFFICIENT_DATA";
          procurement_risk_level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | "UNKNOWN";
          risk_factors?: string[];
          opportunity_status?: "OPEN" | "PARTIALLY_SOURCED" | "SOURCED" | "CONSTRAINED" | "EXPIRED" | "CANCELLED" | "COMPLETED";
          candidate_suppliers_count?: number;
          supplier_concentration_detected?: boolean;
          concentration_ratio?: number | null;
          market_pressure_level?: string | null;
          observed_price_min?: number | null;
          observed_price_max?: number | null;
          observed_price_median?: number | null;
          price_trend?: string | null;
          estimated_procurement_cost?: number | null;
          processing_required?: boolean;
          security_disruption_flag?: boolean;
          constraints?: string[];
          missing_evidence?: string[];
          confidence: number;
          metadata?: Json;
          calculated_at?: string;
        };
        Update: {
          id?: string;
          demand_id?: string | null;
          buyer_id?: string | null;
          commodity?: string;
          state?: string;
          lga?: string | null;
          target_quantity?: number;
          matched_quantity?: number;
          supply_gap?: number;
          unit?: string;
          fulfillment_percentage?: number;
          procurement_priority_score?: number;
          priority_components?: Json;
          recommended_strategy?: "DIRECT_SUPPLIER" | "MULTI_SUPPLIER" | "AGGREGATED_PROCUREMENT" | "PROCESSING_REQUIRED" | "REGIONAL_ALTERNATIVE" | "WAIT_AND_MONITOR" | "INSUFFICIENT_DATA";
          procurement_risk_level?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | "UNKNOWN";
          risk_factors?: string[];
          opportunity_status?: "OPEN" | "PARTIALLY_SOURCED" | "SOURCED" | "CONSTRAINED" | "EXPIRED" | "CANCELLED" | "COMPLETED";
          candidate_suppliers_count?: number;
          supplier_concentration_detected?: boolean;
          concentration_ratio?: number | null;
          market_pressure_level?: string | null;
          observed_price_min?: number | null;
          observed_price_max?: number | null;
          observed_price_median?: number | null;
          price_trend?: string | null;
          estimated_procurement_cost?: number | null;
          processing_required?: boolean;
          security_disruption_flag?: boolean;
          constraints?: string[];
          missing_evidence?: string[];
          confidence?: number;
          metadata?: Json;
          calculated_at?: string;
        };
      };
      procurement_opportunities: {
        Row: {
          id: string;
          snapshot_id: string;
          demand_id: string;
          buyer_id: string | null;
          commodity: string;
          state: string;
          lga: string | null;
          required_quantity: number;
          unit: string;
          desired_delivery_date: string | null;
          priority_score: number;
          priority_level: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
          strategy: "DIRECT_SUPPLIER" | "MULTI_SUPPLIER" | "AGGREGATED_PROCUREMENT" | "PROCESSING_REQUIRED" | "REGIONAL_ALTERNATIVE" | "WAIT_AND_MONITOR" | "INSUFFICIENT_DATA";
          risk_level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | "UNKNOWN";
          status: "OPEN" | "PARTIALLY_SOURCED" | "SOURCED" | "CONSTRAINED" | "EXPIRED" | "CANCELLED" | "COMPLETED";
          matched_quantity: number;
          unmatched_gap: number;
          supplier_count: number;
          notes: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          snapshot_id: string;
          demand_id: string;
          buyer_id?: string | null;
          commodity: string;
          state: string;
          lga?: string | null;
          required_quantity: number;
          unit?: string;
          desired_delivery_date?: string | null;
          priority_score: number;
          priority_level: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
          strategy: "DIRECT_SUPPLIER" | "MULTI_SUPPLIER" | "AGGREGATED_PROCUREMENT" | "PROCESSING_REQUIRED" | "REGIONAL_ALTERNATIVE" | "WAIT_AND_MONITOR" | "INSUFFICIENT_DATA";
          risk_level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | "UNKNOWN";
          status?: "OPEN" | "PARTIALLY_SOURCED" | "SOURCED" | "CONSTRAINED" | "EXPIRED" | "CANCELLED" | "COMPLETED";
          matched_quantity?: number;
          unmatched_gap?: number;
          supplier_count?: number;
          notes?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          snapshot_id?: string;
          demand_id?: string;
          buyer_id?: string | null;
          commodity?: string;
          state?: string;
          lga?: string | null;
          required_quantity?: number;
          unit?: string;
          desired_delivery_date?: string | null;
          priority_score?: number;
          priority_level?: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
          strategy?: "DIRECT_SUPPLIER" | "MULTI_SUPPLIER" | "AGGREGATED_PROCUREMENT" | "PROCESSING_REQUIRED" | "REGIONAL_ALTERNATIVE" | "WAIT_AND_MONITOR" | "INSUFFICIENT_DATA";
          risk_level?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | "UNKNOWN";
          status?: "OPEN" | "PARTIALLY_SOURCED" | "SOURCED" | "CONSTRAINED" | "EXPIRED" | "CANCELLED" | "COMPLETED";
          matched_quantity?: number;
          unmatched_gap?: number;
          supplier_count?: number;
          notes?: string | null;
          metadata?: Json;
          created_at?: string;
        };
      };
      procurement_recommendations: {
        Row: {
          id: string;
          snapshot_id: string;
          opportunity_id: string | null;
          demand_id: string | null;
          recommendation_type: "DIRECT_OFFTAKE" | "SPLIT_ORDER_SOURCING" | "COOPERATIVE_AGGREGATION" | "PROCESSOR_COMMISSIONING" | "INTER_STATE_CORRIDOR_OFFTAKE" | "PRICE_MONITORING_HOLD" | "SUPPLIER_DIVERSIFICATION_REVIEW";
          title: string;
          details: string;
          suggested_action: string;
          confidence: number;
          status: "PROPOSED" | "REVIEWED" | "ACCEPTED" | "REJECTED" | "ACTIONED" | "COMPLETED";
          actioned_by: string | null;
          actioned_at: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          snapshot_id: string;
          opportunity_id?: string | null;
          demand_id?: string | null;
          recommendation_type: "DIRECT_OFFTAKE" | "SPLIT_ORDER_SOURCING" | "COOPERATIVE_AGGREGATION" | "PROCESSOR_COMMISSIONING" | "INTER_STATE_CORRIDOR_OFFTAKE" | "PRICE_MONITORING_HOLD" | "SUPPLIER_DIVERSIFICATION_REVIEW";
          title: string;
          details: string;
          suggested_action: string;
          confidence: number;
          status?: "PROPOSED" | "REVIEWED" | "ACCEPTED" | "REJECTED" | "ACTIONED" | "COMPLETED";
          actioned_by?: string | null;
          actioned_at?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          snapshot_id?: string;
          opportunity_id?: string | null;
          demand_id?: string | null;
          recommendation_type?: "DIRECT_OFFTAKE" | "SPLIT_ORDER_SOURCING" | "COOPERATIVE_AGGREGATION" | "PROCESSOR_COMMISSIONING" | "INTER_STATE_CORRIDOR_OFFTAKE" | "PRICE_MONITORING_HOLD" | "SUPPLIER_DIVERSIFICATION_REVIEW";
          title?: string;
          details?: string;
          suggested_action?: string;
          confidence?: number;
          status?: "PROPOSED" | "REVIEWED" | "ACCEPTED" | "REJECTED" | "ACTIONED" | "COMPLETED";
          actioned_by?: string | null;
          actioned_at?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      food_security_snapshots: {
        Row: {
          id: string;
          commodity: string | null;
          state: string;
          lga: string | null;
          geopolitical_zone: string | null;
          pressure_score: number;
          pressure_level: "LOW_PRESSURE" | "MODERATE_PRESSURE" | "HIGH_PRESSURE" | "CRITICAL_PRESSURE" | "INSUFFICIENT_DATA";
          component_scores: Json;
          availability_status: "ADEQUATE" | "MODERATE_DEFICIT" | "SEVERE_DEFICIT" | "INSUFFICIENT_DATA";
          affordability_status: "STABLE" | "MODERATE_PRESSURE" | "SEVERE_PRESSURE" | "INSUFFICIENT_DATA";
          access_status: "NORMAL" | "ACCESS_PRESSURE" | "ACCESS_CONSTRAINT" | "INSUFFICIENT_DATA";
          stability_status: "STABLE" | "MODERATE_VOLATILITY" | "SEVERE_VOLATILITY" | "INSUFFICIENT_DATA";
          key_drivers: string[];
          constraints: string[];
          missing_evidence: string[];
          confidence: number;
          metadata: Json;
          calculated_at: string;
        };
        Insert: {
          id?: string;
          commodity?: string | null;
          state: string;
          lga?: string | null;
          geopolitical_zone?: string | null;
          pressure_score: number;
          pressure_level: "LOW_PRESSURE" | "MODERATE_PRESSURE" | "HIGH_PRESSURE" | "CRITICAL_PRESSURE" | "INSUFFICIENT_DATA";
          component_scores?: Json;
          availability_status?: "ADEQUATE" | "MODERATE_DEFICIT" | "SEVERE_DEFICIT" | "INSUFFICIENT_DATA";
          affordability_status?: "STABLE" | "MODERATE_PRESSURE" | "SEVERE_PRESSURE" | "INSUFFICIENT_DATA";
          access_status?: "NORMAL" | "ACCESS_PRESSURE" | "ACCESS_CONSTRAINT" | "INSUFFICIENT_DATA";
          stability_status?: "STABLE" | "MODERATE_VOLATILITY" | "SEVERE_VOLATILITY" | "INSUFFICIENT_DATA";
          key_drivers?: string[];
          constraints?: string[];
          missing_evidence?: string[];
          confidence: number;
          metadata?: Json;
          calculated_at?: string;
        };
        Update: {
          id?: string;
          commodity?: string | null;
          state?: string;
          lga?: string | null;
          geopolitical_zone?: string | null;
          pressure_score?: number;
          pressure_level?: "LOW_PRESSURE" | "MODERATE_PRESSURE" | "HIGH_PRESSURE" | "CRITICAL_PRESSURE" | "INSUFFICIENT_DATA";
          component_scores?: Json;
          availability_status?: "ADEQUATE" | "MODERATE_DEFICIT" | "SEVERE_DEFICIT" | "INSUFFICIENT_DATA";
          affordability_status?: "STABLE" | "MODERATE_PRESSURE" | "SEVERE_PRESSURE" | "INSUFFICIENT_DATA";
          access_status?: "NORMAL" | "ACCESS_PRESSURE" | "ACCESS_CONSTRAINT" | "INSUFFICIENT_DATA";
          stability_status?: "STABLE" | "MODERATE_VOLATILITY" | "SEVERE_VOLATILITY" | "INSUFFICIENT_DATA";
          key_drivers?: string[];
          constraints?: string[];
          missing_evidence?: string[];
          confidence?: number;
          metadata?: Json;
          calculated_at?: string;
        };
      };
      agricultural_resilience_snapshots: {
        Row: {
          id: string;
          commodity: string | null;
          state: string;
          lga: string | null;
          resilience_score: number;
          resilience_level: "HIGH_RESILIENCE" | "MODERATE_RESILIENCE" | "VULNERABLE" | "CRITICALLY_VULNERABLE" | "INSUFFICIENT_DATA";
          component_scores: Json;
          vulnerability_factors: string[];
          adaptive_capacities: string[];
          confidence: number;
          metadata: Json;
          calculated_at: string;
        };
        Insert: {
          id?: string;
          commodity?: string | null;
          state: string;
          lga?: string | null;
          resilience_score: number;
          resilience_level: "HIGH_RESILIENCE" | "MODERATE_RESILIENCE" | "VULNERABLE" | "CRITICALLY_VULNERABLE" | "INSUFFICIENT_DATA";
          component_scores?: Json;
          vulnerability_factors?: string[];
          adaptive_capacities?: string[];
          confidence: number;
          metadata?: Json;
          calculated_at?: string;
        };
        Update: {
          id?: string;
          commodity?: string | null;
          state?: string;
          lga?: string | null;
          resilience_score?: number;
          resilience_level?: "HIGH_RESILIENCE" | "MODERATE_RESILIENCE" | "VULNERABLE" | "CRITICALLY_VULNERABLE" | "INSUFFICIENT_DATA";
          component_scores?: Json;
          vulnerability_factors?: string[];
          adaptive_capacities?: string[];
          confidence?: number;
          metadata?: Json;
          calculated_at?: string;
        };
      };
      food_security_dependencies: {
        Row: {
          id: string;
          snapshot_id: string | null;
          commodity: string;
          state: string;
          dependency_type: "REGIONAL_SUPPLY_CONCENTRATION" | "PROCESSING_BOTTLENECK_DEPENDENCY" | "CORRIDOR_TRANSIT_DEPENDENCY" | "SUPPLIER_CONCENTRATION_DEPENDENCY" | "SINGLE_POINT_FAILURE";
          dominant_entity: string;
          concentration_ratio: number;
          threshold_exceeded: number;
          alternative_options_available: number;
          risk_assessment: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          snapshot_id?: string | null;
          commodity: string;
          state: string;
          dependency_type: "REGIONAL_SUPPLY_CONCENTRATION" | "PROCESSING_BOTTLENECK_DEPENDENCY" | "CORRIDOR_TRANSIT_DEPENDENCY" | "SUPPLIER_CONCENTRATION_DEPENDENCY" | "SINGLE_POINT_FAILURE";
          dominant_entity: string;
          concentration_ratio: number;
          threshold_exceeded: number;
          alternative_options_available?: number;
          risk_assessment: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          snapshot_id?: string | null;
          commodity?: string;
          state?: string;
          dependency_type?: "REGIONAL_SUPPLY_CONCENTRATION" | "PROCESSING_BOTTLENECK_DEPENDENCY" | "CORRIDOR_TRANSIT_DEPENDENCY" | "SUPPLIER_CONCENTRATION_DEPENDENCY" | "SINGLE_POINT_FAILURE";
          dominant_entity?: string;
          concentration_ratio?: number;
          threshold_exceeded?: number;
          alternative_options_available?: number;
          risk_assessment?: string;
          created_at?: string;
        };
      };
      food_security_alerts: {
        Row: {
          id: string;
          snapshot_id: string | null;
          title: string;
          commodity: string | null;
          state: string;
          lga: string | null;
          severity: "INFO" | "WATCH" | "ELEVATED" | "HIGH" | "CRITICAL";
          status: "DRAFT" | "REVIEW" | "PUBLISHED" | "ACKNOWLEDGED" | "RESOLVED" | "ARCHIVED";
          summary: string;
          evidence_summary: string;
          contributing_signals: string[];
          source_governance: Json;
          is_public: boolean;
          confidence: number;
          reviewed_by: string | null;
          reviewed_at: string | null;
          review_notes: string | null;
          published_at: string | null;
          resolved_at: string | null;
          expires_at: string | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          snapshot_id?: string | null;
          title: string;
          commodity?: string | null;
          state: string;
          lga?: string | null;
          severity: "INFO" | "WATCH" | "ELEVATED" | "HIGH" | "CRITICAL";
          status?: "DRAFT" | "REVIEW" | "PUBLISHED" | "ACKNOWLEDGED" | "RESOLVED" | "ARCHIVED";
          summary: string;
          evidence_summary: string;
          contributing_signals?: string[];
          source_governance?: Json;
          is_public?: boolean;
          confidence: number;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          review_notes?: string | null;
          published_at?: string | null;
          resolved_at?: string | null;
          expires_at?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          snapshot_id?: string | null;
          title?: string;
          commodity?: string | null;
          state?: string;
          lga?: string | null;
          severity?: "INFO" | "WATCH" | "ELEVATED" | "HIGH" | "CRITICAL";
          status?: "DRAFT" | "REVIEW" | "PUBLISHED" | "ACKNOWLEDGED" | "RESOLVED" | "ARCHIVED";
          summary?: string;
          evidence_summary?: string;
          contributing_signals?: string[];
          source_governance?: Json;
          is_public?: boolean;
          confidence?: number;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          review_notes?: string | null;
          published_at?: string | null;
          resolved_at?: string | null;
          expires_at?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
}
