export interface SigningCertificate {
  id: string;
  subject: string;
  expiresAt: string;
}
export interface SigningInput {
  file: Blob;
  filename: string;
  certificateId: string;
}
export interface SigningOutput {
  signature: Blob;
  filename: string;
  format: 'CAdES-BES';
}
export interface SigningProvider {
  certificates(): Promise<SigningCertificate[]>;
  sign(input: SigningInput): Promise<SigningOutput>;
}
export type SigningRegion = 'RU' | 'EU' | 'CN' | 'OTHER';
export function suggestedRegion(locale: string): SigningRegion {
  if (locale === 'ru') return 'RU';
  if (locale === 'zh') return 'CN';
  if (['pl', 'it', 'es', 'nl', 'fr', 'de'].includes(locale)) return 'EU';
  return 'OTHER';
}
