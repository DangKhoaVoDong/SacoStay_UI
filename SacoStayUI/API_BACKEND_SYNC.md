# Đồng bộ FE ↔ BE

## Lifestyle (quiz → swipe)

| Bước | API | Ghi chú |
|------|-----|---------|
| 1 | `GET /api/Lifestyle/questions` | Trắc nghiệm (không cần auth) |
| 2 | `POST /api/Lifestyle/submit` | Bearer; `selectedOptionIds` — **tenant làm lại / sửa lối sống** (xóa câu trả lời cũ, ghi mới). Không cần PUT riêng cho user |
| 3 | `GET /api/Lifestyle/swipe-deck?limit=&includeSwiped=` | Bearer; **chỉ role tenant** (không admin/landlord), trừ đã swipe trừ khi `includeSwiped=true`, **sắp xếp % hợp cao → thấp** |
| 4 | `POST /api/Lifestyle/swipe?targetUserId&isLike=` | Bearer |

**Discovery (`/discovery`):** route có `tenantGuard` (admin → `/admin`, landlord → `/landlord-profile`). Sau swipe-deck, FE gọi `GET /api/Auth/user/{id}` + `GET /api/Lifestyle/answers/{id}` để hiển thị họ tên, tuổi, khu vực, tình trạng phòng, 2 tag lối sống nổi bật. Sidebar Premium: xem đủ lifestyle answers.

**Swipe FE:** vuốt phải→trái = thích, trái→phải = bỏ qua. Free: **10 thẻ/tuần** (`localStorage`); Premium: không giới hạn. **Tải lại** gọi `includeSwiped=true` để xem lại cả người đã swipe. **Bộ lọc** (giới tính, phòng, tuổi, % hòa hợp) lọc client-side trên deck đã tải.

**Admin CMS** (`/admin` → tab Quiz lối sống):

| API | FE |
|-----|-----|
| `GET /api/Lifestyle/questions` | Danh sách câu hỏi + đáp án |
| `POST /api/Lifestyle/question` | Tạo câu hỏi mới (`content`, `options[]`) |
| `PUT /api/Lifestyle/question` | **Admin CMS** — sửa *nội dung câu hỏi* trong ngân hàng quiz (không phải câu trả lời của tenant) |
| `PUT /api/Lifestyle/options?questionId=` | **Admin CMS** — sửa/thêm *đáp án* của câu hỏi |

**Tenant sửa lối sống:** `/lifestyle-quiz?retake=1&returnUrl=/profile/me` → `POST /api/Lifestyle/submit` (không dùng 2 PUT admin).

**2 câu cuối quiz (phòng trọ):** Câu *giá phòng* chỉ hiện khi chọn *Có* ở câu *đã có phòng trọ chưa*. Chọn *Chưa có* → bỏ qua câu giá, BE không bắt buộc trả lời giá. Đáp án 2 câu này → block **Tình trạng phòng** trên `/profile/me` (qua `GET /api/Lifestyle/my-answers`, không hiện trong grid “Chi tiết lối sống”).

| API | FE |
|-----|-----|
| `GET /api/Lifestyle/my-answers` | Trang `/profile/me` — chi tiết lối sống |
| `GET /api/Lifestyle/answers/{userId}` | Trang `/profile/{userId}` |
| `GET /api/Auth/user/{userId}` | Hồ sơ công khai (+ Bio, Job, LivingArea, DateOfBirth, Gender) |

**Profile:** `/profile/me` sau profile-setup + quiz (tenant & landlord). **Admin** không cần quiz. Sau quiz: `returnUrl` (mặc định `/profile/me`; từ Discovery → `/discovery`). **Thay đổi lối sống** → `/lifestyle-quiz?retake=1&returnUrl=/profile/me`.

## Chat

| API | FE |
|-----|-----|
| `GET /api/Chat/history/{otherUserId}` | `ChatService.getHistory()` — BE: `senderId`, `message`, `sentAt` |
| SignalR `/chatHub` → `SendPrivateMessage(receiverId, message)` | `ChatHubService` |
| `GET /api/Auth/user/{userId}` | `ChatPeerProfileService.fetchPeer()` — tên + `ProfileImage` + `Roles` |

Không có `GET /api/Chat/conversations` — danh sách hội thoại FE lấy từ `localStorage` (contact đã từng mở chat / nhắn). **API này không bắt buộc cho Discovery.** Khi BE bổ sung, dùng để đồng bộ danh sách chat giữa thiết bị (ai đã nhắn, tin cuối, thời gian) thay vì chỉ nhớ trên trình duyệt.

Mở chat: `/chat?with={userId}&name=...&avatar=...&role=landlord|tenants` (name/avatar gợi ý; FE vẫn gọi `Auth/user/{id}`).

`GET /api/RoomPost/search-nearby` cần trả **`userId`**, **`Description`**, **`Area`**, **`MaxPeople`**, **`City`**, **`District`**, **`Status`**, **`Location`** — FE dùng cho chi tiết phòng + bản đồ.

Chi tiết phòng (`/rooms/:id`): `getById()` gộp raw từ my-posts + search-nearby; **Địa điểm gần đó** = 2–3 tin/địa chỉ khác trong bán kính **~2.5 km** quanh tọa độ ghim (cùng API search-nearby).

Tin **PendingPayment** → FE nút **Thanh toán** → `/landlord-pricing?roomPostId=`.

**Xóa tin Hidden:** BE team sẽ bổ sung sau (FE tạm ẩn nút xóa).

**Chat history:** Tin lưu DB qua SignalR `SendPrivateMessage`. `GET /api/Chat/history/{otherUserId}` phải đọc claim `sub` (JWT `MapInboundClaims = false`) — đã sửa tối thiểu trên `ChatController`.

**Tenant Premium:** BE git hiện tại **chưa có** `POST /api/Payment/buy-tenant-premium` (chỉ `buy-package` + `vnpay-return`). FE báo lỗi rõ khi 404.

## Bản đồ (`/map`)

| Nguồn | FE |
|-------|-----|
| `GET /api/RoomPost/search-nearby` (HN + HCM, `listForBrowse`) | Marker + sidebar |
| `Location.Latitude` / `Location.Longitude` trên mỗi tin | `latitude`, `longitude` trên `RoomPostSummary` |

Click phòng trong sidebar hoặc marker → `flyTo` vị trí ghim. Tin không có tọa độ vẫn hiện trong danh sách (ghi chú “Chưa có vị trí trên bản đồ”).

---

## Payment 2 role + Admin

## Payment — landlord + tenant

| Role | Method | Path | FE |
|------|--------|------|-----|
| Chủ trọ | POST | `/api/Payment/buy-package?roomPostId&packageName&returnContext=landlord` | `buyLandlordPackage()` |
| Người thuê | POST | `/api/Payment/buy-tenant-premium` (**chưa có trên BE git**) | `buyTenantPremium()` — 404 cho đến khi BE thêm |
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
