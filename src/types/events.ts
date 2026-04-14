/**
 * @file src/types/events.ts
 * Definições de payloads para eventos de domínio.
 */

export interface OrderEventPayload {
  orderId: string;
  userId?: string;
  notes?: string;
  previousStatusId?: number;
  newStatusId?: number;
  generatedPassword?: string;
  paymentMethod?: string;
}

export interface PaymentRejectedEventPayload extends OrderEventPayload {
  friendlyReason?: string;
  reason?: string;
  statusDetail?: string;
}

export interface OrderShippedEventPayload extends OrderEventPayload {
  trackingCode?: string;
  trackingUrl?: string;
}

export interface UserGuestCreatedEventPayload {
  email: string;
  name: string;
  password: string;
}
