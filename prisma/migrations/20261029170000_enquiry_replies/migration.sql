-- Super Admins can reply to an enquiry by email from the dashboard; the reply is kept in its activity.
ALTER TYPE "ContactInquiryActivityKind" ADD VALUE 'REPLY_SENT' BEFORE 'STATUS_CHANGED';

ALTER TABLE "contact_inquiry_activity" ALTER COLUMN "body" TYPE VARCHAR(5000);
