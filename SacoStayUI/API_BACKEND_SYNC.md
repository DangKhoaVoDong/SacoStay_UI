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

## Test local (tách khỏi web deploy)

| Lệnh | Kết quả |
|------|---------|
| `npm run start` / `npm run start:local` | FE **http://localhost:4200** → API **http://localhost:5219** (`environment.development.ts`) |
| `npm run build` | Bản upload lên sacostay.id.vn (`environment.production.ts`) |

BE: chạy SacoStayAPI profile **http** (5219), `ASPNETCORE_ENVIRONMENT=Development`, có `appsettings.Local.json`. Không dùng `ng serve --configuration production` khi test máy.

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

## eKYC (FPT.AI — xác thực danh tính)

| Bước | API | Ghi chú |
|------|-----|---------|
| 1 | `GET /api/Kyc/my-status` | Bearer; `{ status, adminNote?, submittedAt? }` hoặc `{ status: "NotSubmitted" }` |
| 2 | `POST /api/Kyc/submit` | Bearer; `multipart/form-data`: `FrontIdImage`, `BackIdImage`, `SelfieVideo` (bắt buộc), `VneidScreenshot` (tùy chọn) |

**BE flow:** OCR CCCD (FPT) → Liveness V3 (video + ảnh mặt trước CCCD qua field `cmnd`) → ≥80% similarity → `Approved` + `IsVerified=true`; ngược lại `NeedReupload` (vẫn lưu DB, trả `400` + `message`).

**FE:** `/identity-verification` — bước 1 upload CCCD, bước 2 quay video **6 giây** (720p). Upload MIME: `video/webm` hoặc `video/mp4` (không `;codecs=...`). Sau OTP → bắt buộc eKYC; `profile-setup` có nút xác thực lại khi `NeedReupload`.

**Test local:** BE cần `FptAiConfig:ApiKey` trong `appsettings.Local.json` (hoặc `appsettings.json`). FE `npm run start` → API `http://localhost:5219/api`.

## Chat

`GET /api/Chat/history/{otherUserId}`, SignalR `/chatHub`. Danh sách hội thoại FE vẫn localStorage (chưa có `GET /api/Chat/conversations`).

## Room / Map

`GET /api/RoomPost/search-nearby`, `my-posts`, `create`, v.v. — xem Swagger đầy đủ.

## BE đã bổ sung lại (sau khi team merge — logic cũ Discovery)

- `SubmitUserAnswersAsync`: bỏ qua câu giá khi *chưa có phòng* (2 câu cuối theo id)
- `GetSwipeDeckAsync`: `includeSwiped`, chỉ role tenant, bỏ lọc 50%
- `GetSwipeQuotaAsync`: đọc `Account.TenantPackageType` + `TenantPackageExpiresAt`
- `BuildFrontendReturnUrlAsync`: redirect PayOS theo landlord/tenant

## Guest Discovery (dùng thử Tìm bạn — FE + BE)

| Bước | API | Ghi chú |
|------|-----|---------|
| 1 | `GET /api/Lifestyle/questions` | Không auth — guest làm quiz, FE lưu `localStorage` |
| 2 | `GET /api/Lifestyle/guest-swipe-deck?selectedOptionIds=1,2,3&limit=50` | **BE đã có** — `[AllowAnonymous]`; csv `selectedOptionIds`; trả `[{ userId, matchingScore }]` |
| 3 | `GET /api/Lifestyle/answers/{userId}` | **BE: AllowAnonymous** — enrich thẻ |
| 4 | `GET /api/Auth/user/{userId}` | **BE: AllowAnonymous** — tên, ảnh (không email/phone) |
| 5 | Sau **đăng ký** (không phải đăng nhập) | FE gọi `POST submit` + `POST swipe` — đồng bộ dữ liệu tạm |

**Business:** Guest swipe 5 lượt/tuần (FE `localStorage`). Nhắn tin → bắt **Đăng ký**; đăng nhập tài khoản cũ → FE **xóa** dữ liệu tạm, không sync DB.

**Đăng ký / OTP localhost:** Cần `Resend:ApiKey` **thật** trong `appsettings.Local.json` (copy từ server). `appsettings.json` gốc để `""` — Local **ghi đè** bằng key hợp lệ. Chỉ **xóa** block PayOS/AWS khi không test thanh toán; **không** xóa Resend nếu cần test OTP.

## Gợi ý team BE (chưa sửa — báo trước khi chỉnh)

1. **`GET /api/Auth/profile`** chưa trả `tenantPackageType` / `tenantPackageExpiresAt` — FE tạm dùng `swipe-quota` + session sau PayOS.
2. **Swagger** chưa khai báo query `includeSwiped` trên swipe-deck (API đã hỗ trợ).
3. **`SaveSwipeActionAsync`** không chặn swipe trùng cùng user (có thể tạo nhiều row).
4. **`RemoveLikeAsync`** xóa record like; pass (isLike=false) vẫn nằm trong history swipe-deck exclude.
