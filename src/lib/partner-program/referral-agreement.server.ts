import { createHash } from 'node:crypto';
import {
  buildReferralPartnerAgreementSnapshot,
  REFERRAL_PARTNER_AGREEMENT_TITLE,
  REFERRAL_PARTNER_AGREEMENT_VERSION,
} from './referral-agreement';

export function getCurrentReferralPartnerAgreementDocument() {
  const text = buildReferralPartnerAgreementSnapshot();

  return {
    title: REFERRAL_PARTNER_AGREEMENT_TITLE,
    version: REFERRAL_PARTNER_AGREEMENT_VERSION,
    text,
    sha256: createHash('sha256').update(text, 'utf8').digest('hex'),
  };
}
