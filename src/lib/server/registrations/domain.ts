export const REVIEW_STATES = ['received', 'under_review', 'selected', 'rejected', 'withdrawn'] as const;
export const PARTICIPANT_RESPONSE_STATES = ['not_requested', 'pending', 'confirmed', 'declined'] as const;
export const RECEIPT_STATUSES = ['pending', 'sent', 'failed', 'uncertain'] as const;

export type ReviewState = (typeof REVIEW_STATES)[number];
export type ParticipantResponseState = (typeof PARTICIPANT_RESPONSE_STATES)[number];
export type ReceiptStatus = (typeof RECEIPT_STATUSES)[number];
