-- Switch order email templates from raw HTML to friendly subject/heading/message fields.
ALTER TABLE "shop_order_email_templates" ADD COLUMN "heading" VARCHAR(160);
ALTER TABLE "shop_order_email_templates" ADD COLUMN "message" TEXT;

UPDATE "shop_order_email_templates"
SET
  "heading" = CASE "status"
    WHEN 'PAID' THEN 'Payment confirmed'
    WHEN 'PROCESSING' THEN 'Your order is being prepared'
    WHEN 'SHIPPED' THEN 'Your order is on the way'
    WHEN 'DELIVERED' THEN 'Delivered'
    WHEN 'FAILED' THEN 'There was a problem with your order'
    WHEN 'CANCELLED' THEN 'Order cancelled'
    ELSE 'Order update'
  END,
  "message" = CASE "status"
    WHEN 'PAID' THEN E'Hi {{customerName}},\n\nWe’ve confirmed your payment for order #{{orderNumber}}. We’re getting it ready.'
    WHEN 'PROCESSING' THEN E'Hi {{customerName}},\n\nGood news — order #{{orderNumber}} is now being prepared at {{shopName}}.'
    WHEN 'SHIPPED' THEN E'Hi {{customerName}},\n\nOrder #{{orderNumber}} has shipped. You’ll get another update when it’s delivered.'
    WHEN 'DELIVERED' THEN E'Hi {{customerName}},\n\nOrder #{{orderNumber}} has been marked as delivered. We hope you love it!'
    WHEN 'FAILED' THEN E'Hi {{customerName}},\n\nWe couldn’t complete order #{{orderNumber}}.\n\n{{failureReason}}\n\nIf money was taken, a refund will follow according to your payment method.'
    WHEN 'CANCELLED' THEN E'Hi {{customerName}},\n\nOrder #{{orderNumber}} has been cancelled.\n\n{{failureReason}}'
    ELSE E'Hi {{customerName}},\n\nThere’s an update on order #{{orderNumber}}.'
  END
WHERE "heading" IS NULL OR "message" IS NULL;

ALTER TABLE "shop_order_email_templates" ALTER COLUMN "heading" SET NOT NULL;
ALTER TABLE "shop_order_email_templates" ALTER COLUMN "message" SET NOT NULL;

ALTER TABLE "shop_order_email_templates" DROP COLUMN "htmlBody";
ALTER TABLE "shop_order_email_templates" DROP COLUMN "textBody";
