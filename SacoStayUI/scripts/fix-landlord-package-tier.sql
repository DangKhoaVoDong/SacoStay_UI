-- Chuẩn hóa PackageTier: chỉ BASIC | LITE | PRO | ELITE (bỏ tiền tố LANDLORD_).
-- Chạy trên Neon / PostgreSQL sau khi deploy API mới.

UPDATE "RoomPosts"
SET "PackageTier" = REPLACE("PackageTier", 'LANDLORD_', '')
WHERE "PackageTier" LIKE 'LANDLORD_%';

-- (Tuỳ chọn) Giao dịch thanh toán cũ — chỉ để đồng bộ lịch sử
UPDATE "PaymentTransactions"
SET "PackageName" = REPLACE("PackageName", 'LANDLORD_', '')
WHERE "PackageName" LIKE 'LANDLORD_%'
  AND "BuyerType" = 'Landlord';
