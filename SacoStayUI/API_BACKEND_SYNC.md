# Đồng bộ FE ↔ BE

## Lifestyle (quiz → swipe)

| Bước | API | Ghi chú |
|------|-----|---------|
| 1 | `GET /api/Lifestyle/questions` | Trắc nghiệm (không cần auth) |
| 2 | `POST /api/Lifestyle/submit` | Bearer; `selectedOptionIds` — lưu DB; FE set cờ `localStorage` sau khi submit OK (không xóa khi logout) |
| 3 | `GET /api/Lifestyle/swipe-deck?limit=` | Bearer; user đã submit; lọc ≥50% match |
| 4 | `POST /api/Lifestyle/swipe?targetUserId&isLike=` | Bearer |

API mới (admin CMS, FE tenant không dùng): `PUT /api/Lifestyle/question`, `PUT /api/Lifestyle/options?questionId=`

## Chat

| API | FE |
|-----|-----|
| `GET /api/Chat/history/{otherUserId}` | `ChatService.getHistory()` — BE: `senderId`, `message`, `sentAt` |
| SignalR `/chatHub` → `SendPrivateMessage(receiverId, message)` | `ChatHubService` |
| `GET /api/Auth/user/{userId}` | `ChatPeerProfileService.fetchPeer()` — tên + `ProfileImage` + `Roles` |

Không có `GET /api/Chat/conversations` — danh sách hội thoại FE lấy từ `localStorage` (đã từng nhắn).

Mở chat: `/chat?with={userId}&name=...&avatar=...&role=landlord|tenants` (name/avatar gợi ý; FE vẫn gọi `Auth/user/{id}`).

`GET /api/RoomPost/search-nearby` cần trả **`userId`** (id chủ trọ) trên mỗi tin.

---

## Payment 2 role + Admin

## Payment — landlord + tenant

| Role | Method | Path | FE |
|------|--------|------|-----|
| Chủ trọ | POST | `/api/Payment/buy-package?roomPostId&packageName&returnContext=landlord` | `buyLandlordPackage()` |
| Người thuê | POST | `/api/Payment/buy-tenant-premium?returnContext=tenant` | `buyTenantPremium()` |
| VNPay callback | GET | `/api/Payment/vnpay-return` | BE redirect → `/payment/result?status&context&orderId` |

**Luồng FE:** bấm thanh toán → `goToVnPay()` (cùng tab) → VNPay → BE redirect → `/payment/result`.

**appsettings BE:**

- `Frontend:BaseUrl` → `http://localhost:4200`
- `VNPay:ReturnUrl` → `http://localhost:5219/api/Payment/vnpay-return` (URL callback có `returnContext` trong query)

**Gói chủ trọ:** `BASIC`, `LITE`, `PRO`, `ELITE`.

**Route dự phòng:** `owner/my-posts?payment=completed` vẫn map sang `my-listings` nếu BE cũ redirect cứng.

## Admin

Xem commit `AdminController` + `MapInboundClaims = false` + `[Authorize]` từng action (không gắn cả class).

Login: `admin` / `Admin@123`.

## Commit BE — nên giữ gì?

| Phần | Khuyến nghị |
|------|-------------|
| Commit `1be30dd` (Payment chủ trọ) trên repo team | **Giữ** — nền thanh toán landlord |
| Thay đổi local Payment (`returnContext`, `buy-tenant-premium`, redirect `/payment/result`) | **Giữ / commit** — cần cho tenant + FE hiện tại |
| Chỉ xóa/revert | Khi bạn **không** cần tenant Premium và chấp nhận FE chỉ `buy-package` |
