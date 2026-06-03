# Đồng bộ FE ↔ BE (theo Swagger `Backend_Json.md`)

## Lifestyle (quiz → swipe)

| Bước | API | Ghi chú |
|------|-----|---------|
| 1 | `GET /api/Lifestyle/questions` | Trắc nghiệm (không cần auth) |
| 2 | `POST /api/Lifestyle/submit` | Bearer; `selectedOptionIds` — tenant làm lại quiz. **2 câu cuối (id 22, 23):** chọn *Chưa có phòng* → không bắt buộc câu giá |
| 3 | `GET /api/Lifestyle/swipe-deck?limit=&includeSwiped=` | Bearer; chỉ **tenant**; sắp xếp % cao→thấp; `includeSwiped=true` để Tải lại |
| 4 | `POST /api/Lifestyle/swipe?targetUserId&isLike=` | Bearer |
| 5 | `GET /api/Lifestyle/my-likes` | Wishlist sidebar Discovery |
| 6 | `DELETE /api/Lifestyle/my-likes/{targetUserId}` | Xóa khỏi wishlist |
| 7 | `GET /api/Lifestyle/swipe-quota` | `isPremium`, `remaining`, `weekResetAt` — free 10/tuần |

**Admin CMS:** `POST/PUT /api/Lifestyle/question`, `PUT /api/Lifestyle/options?questionId=`

**Profile:** `GET /api/Lifestyle/my-answers`, `GET /api/Lifestyle/answers/{userId}`, `GET /api/Auth/user/{userId}`

## Payment (PayOS — mới)

| Role | Method | Path | Body |
|------|--------|------|------|
| Chủ trọ | POST | `/api/Payment/buy-landlord-package` | `{ roomPostId, packageName }` — BASIC/LITE/PRO/ELITE |
| Người thuê | POST | `/api/Payment/buy-tenant-package` | `{ packageName: "PREMIUM" }` |
| Callback | GET | `/api/Payment/payos-return` | → redirect FE `/payment/result?status&context&orderId` |
| Webhook | POST | `/api/Payment/payos-webhook` | PayOS server |
| Lịch sử | GET | `/api/Payment/history` | Bearer |

**FE:** `PaymentService.buyLandlordPackage()`, `buyTenantPremium('PREMIUM')`, `goToPayOS(url)`.

**Deploy (production):**

| Thành phần | URL / cấu hình |
|------------|----------------|
| FE | `https://sacostay.id.vn` — `src/environments/environment.ts` |
| API | `https://api.sacostay.id.vn/api` |
| SignalR | `https://api.sacostay.id.vn/chatHub` |
| BE CORS | `Frontend:BaseUrl` = `https://sacostay.id.vn` (`appsettings.Production.json`) |
| DB / JWT / SMTP | **Không** để trống trong `appsettings.json` — dùng `appsettings.Local.json` (dev, gitignore) hoặc biến môi trường trên server: `ConnectionStrings__DefaultConnection`, `Jwt__Key`, … |

**Chạy API local (Visual Studio):** copy `appsettings.Local.json.example` → `appsettings.Local.json`, điền Neon connection (giống bản `publish` trước đây). `ASPNETCORE_ENVIRONMENT=Development`.

**appsettings:** `PayOS:ReturnUrl` → `https://api.sacostay.id.vn/api/Payment/payos-return`

## Presence / online (chat)

| API | Ghi chú |
|-----|---------|
| `POST /api/Activity/ping` | Bearer; body `{ seconds: 30 }` — cập nhật `LastSeenAt` |
| `POST /api/Activity/presence` | Bearer; body `{ userIds: ["guid", ...] }` → `{ userId, lastSeenAt, isOnline }` |
| `GET /api/Auth/user/{userId}` | Thêm `lastSeenAt`, `isOnline` (online nếu seen &lt; 2 phút) |

FE chat: poll presence 30s; chấm xanh = online.

## Chat

`GET /api/Chat/history/{otherUserId}`, SignalR `/chatHub`. Danh sách hội thoại FE vẫn localStorage (chưa có `GET /api/Chat/conversations`).

## Room / Map

`GET /api/RoomPost/search-nearby`, `my-posts`, `create`, v.v. — xem Swagger đầy đủ.

## BE đã bổ sung lại (sau khi team merge — logic cũ Discovery)

- `SubmitUserAnswersAsync`: bỏ qua câu giá khi *chưa có phòng* (2 câu cuối theo id)
- `GetSwipeDeckAsync`: `includeSwiped`, chỉ role tenant, bỏ lọc 50%
- `GetSwipeQuotaAsync`: đọc `Account.TenantPackageType` + `TenantPackageExpiresAt`
- `BuildFrontendReturnUrlAsync`: redirect PayOS theo landlord/tenant

## Gợi ý team BE (chưa sửa — báo trước khi chỉnh)

1. **`GET /api/Auth/profile`** chưa trả `tenantPackageType` / `tenantPackageExpiresAt` — FE tạm dùng `swipe-quota` + session sau PayOS.
2. **Swagger** chưa khai báo query `includeSwiped` trên swipe-deck (API đã hỗ trợ).
3. **`SaveSwipeActionAsync`** không chặn swipe trùng cùng user (có thể tạo nhiều row).
4. **`RemoveLikeAsync`** xóa record like; pass (isLike=false) vẫn nằm trong history swipe-deck exclude.
