# SacoStay — Hướng dẫn chuyển Angular Web → Flutter Mobile

> **Mục đích file này:** Copy sang project Flutter và dùng làm context cho AI khi code app mobile.  
> **Nguồn web hiện tại:** repo `SacoStayUI` (Angular 20 SPA)  
> **Backend:** `SacoStayAPI` (.NET 8) — **giữ nguyên**, Flutter chỉ thay lớp UI.

---

## 1. Tổng quan sản phẩm

**SacoStay** là nền tảng tìm phòng trọ và ghép roommate dành cho sinh viên Việt Nam.

| Vai trò | Chức năng chính |
|---------|-----------------|
| **Guest** | Xem trang chủ, phòng trọ, bản đồ, FAQ; làm lifestyle quiz; thử discovery 5 swipe/tuần |
| **Tenant** | Swipe roommate, chat, xem phòng, mua Premium, eKYC, báo cáo |
| **Landlord** | Đăng tin, quản lý listing, mua gói VIP, xem analytics, chat |
| **Admin** | Dashboard, duyệt tin, quản lý user, xử lý report, CMS lifestyle quiz |

**Tagline:** *Tìm bạn ở ghép hợp gu*

**Production URLs:**
- Web: `https://www.sacostay.id.vn`
- API: `https://api.sacostay.id.vn/api`
- SignalR Hub: `https://api.sacostay.id.vn/chatHub`

**Development URLs:**
- Web: `http://localhost:4200`
- API: `http://localhost:5219/api`
- Hub: `http://localhost:5219/chatHub`

---

## 2. Chiến lược migrate (khuyến nghị)

### Phase 1 — Nền tảng
- [ ] Cấu hình `Environment` (dev/prod API URL)
- [ ] `ApiClient` + JWT interceptor (`Authorization: Bearer`)
- [ ] `AuthRepository` (login, register, OTP, profile, logout)
- [ ] Secure storage: key `saco_stay_token` (giống web)
- [ ] Router + guard theo role (tenant / landlord / admin)
- [ ] Theme SacoStay (màu, font Plus Jakarta Sans)

### Phase 2 — Auth & onboarding
- [ ] Login / Register / OTP / Forgot password
- [ ] eKYC (upload CCCD + video selfie)
- [ ] Profile setup (avatar, bio, ảnh, lifestyle)

### Phase 3 — Core tenant
- [ ] Lifestyle quiz
- [ ] Discovery swipe deck + quota + wishlist
- [ ] Rooms list + room detail + map
- [ ] Chat (REST history + SignalR realtime)

### Phase 4 — Landlord & payment
- [ ] Create listing (multipart + map pin)
- [ ] My listings, status, analytics
- [ ] PayOS redirect (tenant premium + landlord VIP packages)

### Phase 5 — Admin & polish
- [ ] Admin dashboard (nếu cần trên mobile)
- [ ] Push notification (FCM) thay/bổ sung SignalR foreground
- [ ] Deep link `/payment/result`

**Nguyên tắc:** Mirror logic từ Angular services/guards, không đổi contract API trừ khi BE hỗ trợ thêm.

---

## 3. Flutter packages gợi ý

| Chức năng | Package |
|-----------|---------|
| HTTP | `dio` |
| State | `flutter_riverpod` hoặc `bloc` |
| Routing | `go_router` |
| Secure token | `flutter_secure_storage` |
| Prefs (guest quiz) | `shared_preferences` |
| SignalR | `signalr_netcore` |
| Map | `flutter_map` + `latlong2` (OSM tiles) |
| Image pick/camera | `image_picker`, `camera` |
| Video record (eKYC) | `camera` |
| WebView PayOS | `webview_flutter` hoặc `url_launcher` |
| Font | `google_fonts` (Plus Jakarta Sans) |
| i18n | `intl` (locale `vi_VN`) |

---

## 4. Cấu trúc thư mục Flutter đề xuất

```
lib/
├── main.dart
├── app.dart
├── config/
│   ├── environment.dart
│   ├── routes.dart
│   └── theme.dart
├── core/
│   ├── api/
│   │   ├── api_client.dart
│   │   ├── auth_interceptor.dart
│   │   └── api_exception.dart
│   ├── storage/
│   │   ├── token_storage.dart
│   │   └── guest_discovery_storage.dart
│   └── utils/
│       ├── media_url.dart
│       └── json_normalize.dart      # camelCase + PascalCase
├── models/                          # Mirror src/app/models/
├── repositories/                    # Mirror src/app/services/
├── features/
│   ├── auth/
│   ├── onboarding/
│   ├── discovery/
│   ├── rooms/
│   ├── map/
│   ├── chat/
│   ├── landlord/
│   ├── payment/
│   └── admin/
└── shared/widgets/                  # Toast, confirm, loading, report modal
```

---

## 5. Brand & UI

### Màu (dùng xuyên suốt app)

| Token | Hex | Dùng cho |
|-------|-----|----------|
| `sacoOrange` | `#FF9F43` | Primary, CTA, focus |
| `sacoOrangeDark` | `#FF8C2A` | Gradient hover |
| `sacoBlue` | `#1A1A2E` | Heading, dark bg |
| `sacoGray` | `#6B7280` | Body text |
| Background | `#FFF8F0` | Page bg |
| VIP ELITE | `#EF4444` | Badge |
| VIP PRO | `#F59E0B` | Badge |
| VIP LITE | `#2563EB` | Badge |

### Font
- **Plus Jakarta Sans** — weights 400, 500, 600, 700

### Assets cần copy từ web (`src/image/` → `assets/images/`)

| File | Dùng cho |
|------|----------|
| `Background_Image_2.png` | Hero home |
| `logoSacoStay đen.png` | Logo chính (navbar, auth, footer) |
| `ảnh web logo SacoStay trắng.png` | Logo landlord sidebar, app icon |
| `Icon/Discovery.png` | Nav discovery |
| `Icon/Rooms.png` | Nav phòng trọ |
| `Icon/maps.png` | Nav bản đồ |
| `Icon/Chat.png` | Nav chat |
| `Icon/Tenant-pricing.png` | Nav bảng giá |

**pubspec.yaml:**
```yaml
flutter:
  assets:
    - assets/images/
    - assets/images/Icon/
```

---

## 6. Storage keys (phải khớp web để sync guest flow)

| Key | Storage | Mục đích |
|-----|---------|----------|
| `saco_stay_token` | secure / local | JWT |
| `saco_stay_user` | prefs | Cache user JSON |
| `temp_email`, `temp_password`, … | prefs | OTP auto-login sau register |
| `saco_pending_user_role` | session | tenant / landlord sau register |
| `saco_auth_return_url` | session | Redirect sau login |
| `saco_lifestyle_quiz_completed` | prefs | Flag đã làm quiz |
| `saco_guest_discovery_*` | prefs | Guest swipe/quiz local |
| `saco_chat_unread_{userId}` | prefs | Unread count chat |
| Chat contacts cache | prefs | `chat-contacts-storage` logic |

---

## 7. Auth flow (mirror Angular)

```
Register → POST /Auth/register
  → lưu temp_email, temp_password, pending role
  → OTP screen → POST /Auth/verify-email-otp
  → auto POST /Auth/login → lưu saco_stay_token
  → finalize profile (PUT /Auth/update-profile nếu cần)
  → /identity-verification (eKYC bắt buộc)
  → profile-setup HOẶC discovery HOẶC landlord-profile

Login → POST /Auth/login
  → lưu token → GET /Auth/profile
  → redirect theo role:
      admin → /admin
      landlord → returnUrl hoặc landlord-profile
      tenant → returnUrl hoặc home/discovery

Logout → xóa saco_* keys, disconnect SignalR
401 → clear session → /login?returnUrl=...
```

### Login request body
```json
{
  "emailPhoneorUsername": "user@email.com",
  "password": "******"
}
```

### Register request (RegisterRequest)
- `email`, `password`, `confirmPassword`, `firstName`, `lastName`, `phoneNumber`, `role` (`tenant` | `landlord`)

### Token
- Header mọi request (trừ auth public): `Authorization: Bearer {token}`
- SignalR hub: truyền token qua `accessTokenFactory` (Flutter: `HttpConnectionOptions(accessToken: () => token)`)

---

## 8. Guards / Navigation rules

| Guard | Logic Flutter |
|-------|---------------|
| **authGuard** | Không có token → `/login?returnUrl=` |
| **tenantGuard** | Guest OK; admin → `/admin`; landlord → `/landlord-profile` |
| **landlordGuard** | Phải landlord; guest → `/login?role=landlord&returnUrl=` |
| **adminGuard** | `roles` chứa `admin` |

**Role detection:** normalize `user.roles[]` — chứa `admin` → admin; chứa `landlord` → landlord; còn lại → tenant.

**Home `/`:** nếu admin đã login → redirect `/admin`.

---

## 9. Toàn bộ routes (Angular → Flutter screens)

| Route | Screen | Guard |
|-------|--------|-------|
| `/` | Home | — |
| `/login`, `/register`, `/auth` | Auth | — |
| `/otp-verification` | OTP | — |
| `/forgot-password` | Forgot password | — |
| `/verify-reset-otp` | Verify reset OTP | — |
| `/reset-password` | Reset password | — |
| `/identity-verification` | eKYC | auth |
| `/profile-setup` | Profile setup | auth |
| `/profile/:id` | User profile | auth |
| `/lifestyle-quiz` | Lifestyle quiz | — |
| `/discovery` | Swipe discovery | tenant* |
| `/tenant-pricing` | Tenant premium | — |
| `/rooms` | Room list | — |
| `/rooms/:id` | Room detail | — |
| `/map` | Map | — |
| `/chat` | Chat (tenant shell) | auth |
| `/landlord-profile` | Landlord profile | auth + landlord |
| `/my-listings`, `/owner/my-posts` | My listings | auth + landlord |
| `/create-listing` | Create listing | auth + landlord |
| `/landlord-pricing` | Landlord VIP | auth + landlord |
| `/listing-viewers` | View analytics | auth + landlord |
| `/landlord-chat` | Chat landlord shell | auth + landlord |
| `/payment/result` | PayOS return | — |
| `/admin` | Admin dashboard | auth + admin |
| `/terms`, `/faq`, `/pricing`, … | Legal/FAQ | — |

---

## 10. API endpoints (base: `{apiUrl}`)

### Auth — `AuthService`
| Method | Path | Body |
|--------|------|------|
| POST | `/Auth/login` | `{ emailPhoneorUsername, password }` |
| POST | `/Auth/register` | RegisterRequest |
| POST | `/Auth/verify-email-otp?email=&otp=` | empty |
| GET | `/Auth/profile` | Bearer |
| PUT | `/Auth/update-profile` | **multipart**, PascalCase fields |
| DELETE | `/Auth/delete-profile-image?imageUrl=` | |
| GET | `/Auth/user/{userId}` | Public profile |
| POST | `/Auth/forgot-password` | |
| POST | `/Auth/verify-reset-otp` | |
| POST | `/Auth/reset-password` | |

**Multipart profile fields (PascalCase):** `FirstName`, `LastName`, `PhoneNumber`, `DateOfBirth`, `Bio`, `AvatarImage`, `ProfileImages`, …

### Lifestyle — `LifestyleService`
| Method | Path |
|--------|------|
| GET | `/Lifestyle/questions` |
| POST | `/Lifestyle/submit` → `{ selectedOptionIds: string[] }` |
| GET | `/Lifestyle/swipe-deck?limit=&includeSwiped=` |
| GET | `/Lifestyle/guest-swipe-deck?selectedOptionIds=&limit=` |
| POST | `/Lifestyle/swipe?targetUserId=&isLike=` |
| GET | `/Lifestyle/my-likes` |
| DELETE | `/Lifestyle/my-likes/{targetUserId}` |
| GET | `/Lifestyle/swipe-quota` |
| GET | `/Lifestyle/my-answers` |
| GET | `/Lifestyle/answers/{userId}` |
| GET | `/Lifestyle/match/{targetUserId}` |
| POST/PUT | `/Lifestyle/question`, `/Lifestyle/options` (admin CMS) |

**Swipe quota:** Free ~10/tuần; Premium unlimited. Guest: 5/tuần local.

### RoomPost — `RoomPostService`
| Method | Path |
|--------|------|
| GET | `/RoomPost/my-posts` |
| GET | `/RoomPost/search-nearby?userLat=&userLng=&radiusInKm=` |
| POST | `/RoomPost/create` | multipart PascalCase |
| PUT | `/RoomPost/{id}/status` | `{ status, currentPeople? }` |
| DELETE | `/RoomPost/{id}` |
| POST | `/RoomPost/{id}/view` |
| GET | `/RoomPost/{id}/analytics` |

**Create listing multipart (PascalCase):** `Title`, `DetailedAddress`, `District`, `City`, `Latitude`, `Longitude`, `Price`, `Area`, `MaxOccupants`, `Description`, `Amenities`, `ImageFiles[]`, …

**Không có** `GET /RoomPost/{id}` — detail lấy từ `search-nearby` hoặc `my-posts`.

**Map defaults:** Hà Nội `21.0285, 105.8542`; TP.HCM `10.7769, 106.7009`; radius 25–150 km.

### Payment — `PaymentService`
| Method | Path | Body |
|--------|------|------|
| POST | `/Payment/buy-landlord-package` | `{ roomPostId, packageName }` — BASIC/LITE/PRO/ELITE |
| POST | `/Payment/buy-tenant-package` | `{ packageName: "PREMIUM" }` |

BE redirect PayOS → `GET /Payment/payos-return` → FE `/payment/result?status&context&orderId`

### Chat — `ChatService` + SignalR
| Method | Path |
|--------|------|
| GET | `/Chat/conversations` |
| GET | `/Chat/history/{otherUserId}` |
| Hub invoke | `SendPrivateMessage(receiverId, message)` |
| Hub listen | `ReceiveMessage`, `ReceiveNotification` |

### Presence — `PresenceService`
| Method | Path |
|--------|------|
| POST | `/Activity/presence` | `{ userIds: string[] }` |
| Fallback | GET `/Auth/user/{id}` → `lastSeenAt`, `isOnline` |

Online = `lastSeenAt` trong vòng **2 phút**. Poll ~30s trong màn chat.

### Notification
| Method | Path |
|--------|------|
| GET | `/Notification?page=&pageSize=` |
| GET | `/Notification/unread-count` |
| PATCH | `/Notification/{id}/read` |
| PATCH | `/Notification/read-all` |

### KYC — `KycService`
| Method | Path |
|--------|------|
| GET | `/Kyc/my-status` |
| POST | `/Kyc/submit` | multipart: `FrontIdImage`, `BackIdImage`, `SelfieVideo`, optional `VneidScreenshot` |

### Report — `ReportService`
| Method | Path |
|--------|------|
| POST | `/Report` | multipart PascalCase |
| GET | `/Report` | Admin |

### Admin — `AdminService`
| Method | Path |
|--------|------|
| GET | `/Admin/dashboard` |
| GET | `/Admin/users?limit=` |
| GET | `/Admin/room-posts?status=` |
| POST | `/Admin/room-posts/{id}/approve` |
| POST | `/Admin/room-posts/{id}/reject` |
| POST | `/Admin/reports/{id}/process` | `{ isValid, adminNote? }` |

### User profile images
| Method | Path |
|--------|------|
| GET | `/User/profile-images` |
| POST | `/User/profile-images` | multipart `Files[]` |
| DELETE | `/User/profile-images?imageUrl=` |

---

## 11. Models chính (mirror `src/app/models/`)

### `UserProfile`
- `id`, `email`, `firstName`, `lastName`, `phoneNumber`, `dateOfBirth`, `bio`, `avatarUrl`, `roles[]`, `isVerified`, …

### `SwipeDeckCard` / `DiscoveryCard`
- User info + lifestyle tags + compatibility score + photos

### `RoomPostSummary` / `RoomPostDetail`
- `id`, `title`, `price`, `address`, `latitude`, `longitude`, `vipTier`, `images[]`, `status`, …

### `ChatMessage`, `ChatConversation`
- `senderId`, `receiverId`, `content`, `sentAt`, …

### `AppNotification`
- `id`, `title`, `body`, `isRead`, `createdAt`, …

### `KycStatusResponse`
- Status enum: pending / approved / rejected

**Quan trọng:** Mọi parser JSON phải đọc cả **camelCase** và **PascalCase** (BE .NET có thể trả cả hai).

---

## 12. Media URL helper

```dart
// Mirror utils/media-url.ts
String resolveMediaUrl(String? path, String apiUrl) {
  if (path == null || path.isEmpty) return '';
  if (path.startsWith('http')) return path;
  final base = apiUrl.replaceAll(RegExp(r'/api/?$'), '');
  return path.startsWith('/') ? '$base$path' : '$base/$path';
}
```

Fallback avatar: `https://ui-avatars.com/api/?name={name}&background=FF9F43&color=fff`

---

## 13. Guest discovery (SharedPreferences)

Logic mirror `guest-discovery.storage.ts`:
1. Guest làm quiz → lưu `selectedOptionIds` local
2. Discovery gọi `GET /Lifestyle/guest-swipe-deck`
3. Giới hạn **5 swipe/tuần** local
4. Sau register → `GuestDiscoverySyncService`: submit quiz + sync swipes lên BE

---

## 14. Validation (profile — mirror `profile-validators.ts`)

| Field | Rule |
|-------|------|
| Họ / Tên | Chỉ chữ cái + khoảng trắng (Unicode `\p{L}`), không số/ký tự đặc biệt |
| Ngày sinh | Required; không tương lai; ≥16 tuổi; không trước 01/01/1950 |
| Lỗi tên | *Chỉ được dùng chữ cái, không số hoặc ký tự đặc biệt* |
| Lỗi ngày sinh | *Ngày sinh không phù hợp* |

---

## 15. Tích hợp bên thứ ba

| Dịch vụ | Web | Flutter |
|---------|-----|---------|
| SignalR | `@microsoft/signalr` | `signalr_netcore` |
| Bản đồ | Leaflet + OSM | `flutter_map` |
| Thanh toán | PayOS redirect (WebView/tab) | `webview_flutter` / deep link |
| eKYC | FPT.AI qua BE | `camera` + multipart upload |
| Ảnh BE | AWS S3 (URL relative) | Same `resolveMediaUrl` |

---

## 16. Màn hình ưu tiên cho MVP mobile

1. Splash + Login/Register/OTP
2. Home (rút gọn từ web)
3. Lifestyle quiz → Discovery swipe
4. Rooms + Room detail
5. Chat + SignalR
6. Profile setup + eKYC
7. Landlord: create listing + my listings
8. Payment result deep link
9. Map (phase 2 nếu phức tạp)

**Có thể bỏ trên mobile v1:** Admin dashboard, FAQ dài (link WebView), legal pages.

---

## 17. Prompt mẫu cho AI Flutter

Khi bắt đầu feature, paste context:

```
Đang build SacoStay Flutter app. Đọc FLUTTER_MIGRATION_GUIDE.md.
Backend: https://api.sacostay.id.vn/api
Token key: saco_stay_token
Mirror logic Angular tại: src/app/services/{service}.ts và src/app/pages/{page}/
Multipart upload dùng PascalCase field names (.NET).
JSON parser hỗ trợ camelCase + PascalCase.
Brand: primary #FF9F43, dark #1A1A2E, font Plus Jakarta Sans.
```

Ví dụ feature cụ thể:

```
Implement Discovery screen Flutter theo FLUTTER_MIGRATION_GUIDE.md section 10 Lifestyle.
- Gọi GET /Lifestyle/swipe-deck
- Swipe card UI (like/pass)
- GET /Lifestyle/swipe-quota hiển thị banner
- POST /Lifestyle/swipe khi user swipe
- Guest mode: guest-swipe-deck + local quota 5/tuần
Reference Angular: src/app/pages/discovery/
```

---

## 18. File Angular tham chiếu nhanh

| Mục đích | Path |
|----------|------|
| Routes | `src/app/app.routes.ts` |
| Guards | `src/app/core/guards/*.ts` |
| Interceptor | `src/app/core/interceptors/auth.interceptor.ts` |
| Environment | `src/environments/environment*.ts` |
| Models | `src/app/models/*.ts` |
| Services | `src/app/services/*.ts` |
| Utils | `src/app/utils/*.ts` |
| API sync doc | `API_BACKEND_SYNC.md` |
| Swagger export | `Backend_Json.md` |
| Project guide | `PROJECT_GUIDE.md` |

---

## 19. Checklist trước khi release app

- [ ] Token lưu secure storage (iOS Keychain / Android EncryptedSharedPreferences)
- [ ] PayOS return URL / deep link scheme cấu hình
- [ ] SignalR reconnect khi app foreground
- [ ] Upload multipart đúng PascalCase
- [ ] Test guest → register → sync discovery
- [ ] Test landlord create listing + map pin
- [ ] Locale `vi_VN` cho date/time
- [ ] App icon từ `ảnh web logo SacoStay trắng.png`

---

*Tài liệu sinh từ SacoStayUI (Angular). Cập nhật khi BE hoặc web thay đổi contract.*
