-- Remove FK constraint on email_sequences.lead_id (contacts are in crm_contacts, not leads)
ALTER TABLE email_sequences DROP CONSTRAINT IF EXISTS email_sequences_lead_id_fkey;
-- Rename column to contact_id for clarity
ALTER TABLE email_sequences RENAME COLUMN lead_id TO contact_id;
