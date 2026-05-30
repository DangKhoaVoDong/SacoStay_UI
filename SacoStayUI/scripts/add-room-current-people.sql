-- Chạy trực tiếp trên Neon / PostgreSQL khi không dùng được `dotnet ef database update`
-- Bảng có thể là "RoomPosts" (EF mặc định)

ALTER TABLE "RoomPosts"
ADD COLUMN IF NOT EXISTS "CurrentPeople" integer NOT NULL DEFAULT 0;

-- Kiểm tra:
-- SELECT "Id", "Title", "MaxPeople", "CurrentPeople", "PackageTier", "Status" FROM "RoomPosts" LIMIT 5;
