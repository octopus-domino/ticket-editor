import type { JourneyBranding } from './branding';
export type JourneyKind =
  | 'INVITATION'
  | 'CERTIFICATE'
  | 'MENU'
  | 'PROPOSAL'
  | 'TICKET'
  | 'GIFT'
  | 'BADGE'
  | 'PASS'
  | 'RESUME'
  | 'SCHEDULE'
  | 'GREETING'
  | 'VCARD'
  | 'LABEL'
  | 'PRICETAG'
  | 'PROPERTY'
  | 'TOUR';
export interface JourneyField {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'date' | 'time';
  required: boolean;
}
export interface JourneyDefinition {
  slug: string;
  kind: JourneyKind;
  title: string;
  description: string;
  theme: 'sage' | 'rose' | 'ink';
  fields: JourneyField[];
  branding?: JourneyBranding | null;
}
export interface JourneyDocument {
  id: string;
  kind: JourneyKind;
  title: string;
  data: Record<string, string>;
  updatedAt: string;
}
export interface CreatedJourney {
  document: JourneyDocument;
  managementKey: string;
  batchId?: string;
}
export interface JourneyStatus {
  state: 'ACTIVE' | 'USED' | 'EXPIRED' | 'REVOKED';
  usedAt: string | null;
  validUntil: string;
  consumable: boolean;
}
export interface JourneyBatch {
  id: string;
  title: string;
  documents: { document: JourneyDocument; status: JourneyStatus }[];
}
