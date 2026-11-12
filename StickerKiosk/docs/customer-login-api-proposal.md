# Đề xuất API đăng nhập Customer bằng email hoặc số điện thoại

> **Đã được thay thế bởi yêu cầu mới ngày 12/11/2026:** Customer không đăng nhập. Khách chọn/chỉnh mẫu trước; chỉ tại checkout mới nhập `fullName`, `phone`, `email`. Không triển khai Customer login, OTP hoặc JWT từ đề xuất lịch sử bên dưới. Luồng Admin vẫn giữ nguyên và tách riêng. Xem [guest-checkout-api-gap.md](guest-checkout-api-gap.md) cho hợp đồng hiện có và phần còn thiếu của guest checkout.

**Trạng thái: tài liệu lịch sử đã lỗi thời, không nằm trong kế hoạch triển khai.** Không dùng các endpoint đề xuất bên dưới làm danh sách công việc hiện hành hoặc lý do chặn guest checkout. Yêu cầu mới không cần Customer login.

Ngày đối chiếu: 12/11/2026, Asia/Saigon. **Đây là tài liệu đề xuất thuộc Frontend, chưa phải API đang chạy.** Không sửa Backend, schema, dữ liệu hoặc hợp đồng hiện hành.

## API thực tế trên BE

Checkout BE đang ở `2e6f800dd0b554e0629c5495445c8f3f336be913`. Local HEAD, `origin/BE` và `git ls-remote origin refs/heads/BE` cùng trỏ tới commit này; working tree BE sạch. Swagger đang chạy tại `http://127.0.0.1:5143/swagger/v1/swagger.json` xác nhận:

| API hiện có | Hành vi |
| --- | --- |
| `POST /api/auth/login` | Nhận `{username,password}`, kiểm tra bảng ADMIN và BCrypt; chỉ cấp JWT role Admin |
| `GET /api/auth/me` | Lấy thông tin Admin từ JWT; không nhận Customer |
| `POST /api/auth/change-password` | Đổi mật khẩu Admin |
| `POST /api/customers` | Công khai, nhận `{fullName,phone,email}`, trả201 `{customerId}`; chỉ lưu liên hệ, không xác minh chủ email/điện thoại, không cấp quyền hoặc JWT |
| `/api/admin/customers` và `/api/admin/customers/{id}` | Quản trị hồ sơ khách hàng, chỉ Admin |
| `/api/orders` và `/api/orders/by-customer/{id}` | Chỉ Admin; không có endpoint đặt/xem đơn tự phục vụ cho Customer |

Không có Customer login, OTP, lookup công khai bằng email/điện thoại hoặc phát token Customer trong source hiện tại. Không thể gọi `auth/login` bằng email/điện thoại và bỏ password: DTO yêu cầu Username và Password, service chỉ tìm Admin.Username.

## Yêu cầu trải nghiệm

- Homepage, chọn mẫu, vẽ và mô phỏng xịt3D mở công khai.
- Chỉ khi bấm **Yêu cầu xịt lên dĩa** mới mở bước nhận diện/đăng nhập Customer.
- Người dùng nhập **một trường `identifier`**, là email hoặc số điện thoại; không yêu cầu đặt/nhập mật khẩu.
- Bản phối cục bộ giữ nguyên trong sessionStorage khi sang trang đăng nhập và quay lại.
- Chỉ điều hướng tiếp sau phản hồi xác nhận hợp lệ của BE. Không coi nhập identifier, lưu liên hệ hoặc nhận `customerId` là đăng nhập thành công.

## Cần chốt: nhận diện liên hệ hay xác minh tài khoản

Email/số điện thoại là thông tin nhận diện, tự nó không chứng minh người nhập đang sở hữu địa chỉ/số đó. Controller đăng ký hiện tại cũng ghi rõ giới hạn này.

| Lựa chọn | Kết quả đúng để Frontend sử dụng |
| --- | --- |
| Chỉ nhập identifier, không password và không xác minh | Là chọn/ghi nhận liên hệ. Không cấp JWT Customer có quyền xem hồ sơ hoặc lịch sử đơn chỉ từ identifier. Có thể tiếp tục luồng gửi thông tin mới nếu BE thiết kế riêng, nhưng không hiển thị như phiên Customer đã xác minh. |
| Đăng nhập không mật khẩu, xác minh bằng mã dùng một lần | Giao diện vẫn không có password. BE gửi mã tới email/điện thoại, kiểm tra mã rồi mới cấp phiên Customer. Cần quyết định sản phẩm và cấu hình gửi mã trước khi triển khai. |

Frontend hiện chỉ chuẩn bị trường identifier và thông báo khả năng chưa được BE hỗ trợ. Không tự gửi OTP, phát JWT, dùng lại token Admin hoặc giả đăng nhập.

## Hợp đồng đề xuất nếu cần phiên Customer đã xác minh

Các đường dẫn dưới đây **chưa tồn tại**. Dùng envelope `{success,message,data,errors}` như BE hiện tại.

### 1. Bắt đầu đăng nhập không mật khẩu

`POST /api/customer-auth/login`, AllowAnonymous:

```json
{ "identifier": "customer@example.com" }
```

Hoặc:

```json
{ "identifier": "+84901234567" }
```

Phản hồi202 đề xuất:

```json
{
  "success": true,
  "message": "Verification requested",
  "data": {
    "challengeId": "opaque-server-issued-id",
    "channel": "email",
    "maskedDestination": "c***@example.com",
    "expiresIn": 300
  },
  "errors": null
}
```

`channel` là `email` hoặc `sms`. Các giá trị trong ví dụ chỉ minh họa hợp đồng. Thời hạn mã và số lần gửi/thử do BE quyết định. Câu trả lời cần thống nhất để không công khai identifier nào đã có hồ sơ. Không trả danh sách Customer, họ tên, đơn hoặc JWT ở bước này.

BE chuẩn hóa identifier theo quy tắc đã chốt; với điện thoại cần chốt quốc gia mặc định/định dạng số quốc tế. Với hồ sơ trùng email/điện thoại, cần quy tắc liên kết tài khoản rõ ràng; không tự lấy bản ghi đầu tiên hoặc ghép hồ sơ từ Frontend.

### 2. Xác minh và nhận phiên

`POST /api/customer-auth/verify`, AllowAnonymous:

```json
{ "challengeId": "opaque-server-issued-id", "code": "123456" }
```

Phản hồi200 đề xuất sau khi BE xác minh thành công:

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "accessToken": "server-signed-customer-jwt",
    "tokenType": "Bearer",
    "expiresIn": 3600,
    "user": {
      "id": 27,
      "fullName": "Tên khách hàng",
      "email": "customer@example.com",
      "phone": "+84901234567",
      "role": "Customer"
    }
  },
  "errors": null
}
```

JWT do BE ký và xác định Customer đã xác minh; không tin `customerId` hay role do client gửi. `expiresIn` là giá trị thực do server trả. Frontend dùng session key và Auth context riêng cho Customer; không nới `isUser()` của phiên Admin để hai role dùng lẫn nhau.

Phản hồi lỗi đề xuất:400 identifier/code không hợp lệ,401 mã sai/hết hạn,429 vượt giới hạn; UI giữ bản phối, cho sửa identifier hoặc xin mã lại theo thời gian BE trả. Không coi lỗi mạng là thành công.

### 3. Xác minh phiên sau reload

`GET /api/customer-auth/me`, role Customer: trả cùng cấu trúc `user` đã xác minh.401 xóa phiên Customer và quay về đăng nhập; không xóa hoặc thay phiên Admin độc lập.

Nếu không chọn OTP, cần chốt một cơ chế xác minh khác hoặc giữ luồng ở mức liên hệ chưa xác minh. Không tự triển khai giả định này trong FE/BE ở phiên hiện tại.

## API yêu cầu xịt của Customer cũng cần hợp đồng riêng

Customer token không có quyền gọi `/api/orders` hoặc `/api/orders/by-customer/{id}` hiện tại. Không mở các API quản trị cho Customer chỉ để hoàn thiện giao diện.

Đề xuất tối thiểu, chỉ với mẫu đã có trong xưởng:

- `POST /api/customer/orders`, role Customer, body `{plateId,chocoTemplateId}`. BE lấy customerId từ phiên, kiểm tra dĩa/mẫu tương thích, màu hoạt động, tồn kho và giá; tạo đơn Pending và trả id/orderCode/status.
- `GET /api/customer/orders` và `GET /api/customer/orders/{id}` chỉ trả đơn thuộc Customer đang đăng nhập.
- API danh mục công khai hoặc danh mục dành cho Customer cần được định nghĩa nếu người dùng phải chọn dĩa/mẫu từ dữ liệu thật trước đăng nhập. `/api/plates` và `/api/choco-templates` hiện vẫn chỉ Admin.

Các đường vẽ/màu/độ dày trong bản xem3D hiện không nằm trong DTO tạo đơn. Muốn gửi chính bản phối tùy chỉnh cần hợp đồng design riêng (định dạng đường nét, giới hạn kích thước, phiên bản và kiểm tra tương thích). Không nhét JSON bản phối vào URL ảnh/G-code hoặc giả mẫu đã lưu. BE cũng chưa có API điều khiển robot; đơn Pending không có nghĩa robot đã phun.

## Phạm vi đang giữ nguyên

Admin vẫn đăng nhập `/api/auth/login` với username/password và tạo đơn bằng `/api/orders` với3ID như cũ. RequestPanel chỉ dùng API thật trong phiên Admin. Tài liệu này không tự cho phép đổi BE, chạy migration hoặc phát sinh dữ liệu thử.
