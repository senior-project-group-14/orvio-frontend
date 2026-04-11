/**
 * Application-wide constants matching backend lookup table IDs
 * These MUST stay in sync with backend constants and database lookup tables
 */

export const ALERT_STATUS = {
  OPEN: 0,
  RESOLVED: 1,
  ACKNOWLEDGED: 2,
  READ: 3,
} as const;

export const DEVICE_STATUS = {
  ACTIVE: 0,
  INACTIVE: 1,
  OFFLINE: 2,
} as const;

export const TRANSACTION_STATUS = {
  PENDING: 0,
  COMPLETED: 1,
  CANCELLED: 2,
  DISPUTED: 3,
  REFUNDED: 4,
  FAILED: 5,
} as const;

export const ACTION_TYPE = {
  ADD: 0,
  REMOVE: 1,
} as const;

export const USER_ROLE = {
  ADMIN: 0,
  SYSTEM_ADMIN: 1,
} as const;

export const ACCESS_REASON = {
  RESTOCKING: 0,
  MAINTENANCE: 1,
  INVENTORY_CHECK: 2,
} as const;

export const DISPUTE_REASON = {
  INCORRECT_CHARGE: 0,
  NOT_RECEIVED: 1,
  DAMAGED_PRODUCT: 2,
  OTHER: 3,
} as const;

// Helper type exports for TypeScript
export type AlertStatus = typeof ALERT_STATUS[keyof typeof ALERT_STATUS];
export type DeviceStatus = typeof DEVICE_STATUS[keyof typeof DEVICE_STATUS];
export type TransactionStatus = typeof TRANSACTION_STATUS[keyof typeof TRANSACTION_STATUS];
export type ActionType = typeof ACTION_TYPE[keyof typeof ACTION_TYPE];
export type UserRole = typeof USER_ROLE[keyof typeof USER_ROLE];
export type AccessReason = typeof ACCESS_REASON[keyof typeof ACCESS_REASON];
export type DisputeReason = typeof DISPUTE_REASON[keyof typeof DISPUTE_REASON];

// Reverse mappings for display (integer to string)
export const ALERT_STATUS_NAMES: Record<number, string> = {
  [ALERT_STATUS.OPEN]: 'Open',
  [ALERT_STATUS.RESOLVED]: 'Resolved',
  [ALERT_STATUS.ACKNOWLEDGED]: 'Acknowledged',
  [ALERT_STATUS.READ]: 'Open',
};

export const DEVICE_STATUS_NAMES: Record<number, string> = {
  [DEVICE_STATUS.ACTIVE]: 'Active',
  [DEVICE_STATUS.INACTIVE]: 'Inactive',
  [DEVICE_STATUS.OFFLINE]: 'Offline',
};

export const TRANSACTION_STATUS_NAMES: Record<number, string> = {
  [TRANSACTION_STATUS.PENDING]: 'Pending',
  [TRANSACTION_STATUS.COMPLETED]: 'Completed',
  [TRANSACTION_STATUS.CANCELLED]: 'Cancelled',
  [TRANSACTION_STATUS.DISPUTED]: 'Disputed',
  [TRANSACTION_STATUS.REFUNDED]: 'Refunded',
  [TRANSACTION_STATUS.FAILED]: 'Failed',
};
