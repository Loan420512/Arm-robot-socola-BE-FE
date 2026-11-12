# Guest checkout: API hiện có và phần còn thiếu

Yêu cầu hiện hành ngày 12/11/2026: **Customer không đăng nhập**. Khách xem/chỉnh mẫu chocolate công khai, sau đó nhập họ tên, số điện thoại và email tại checkout. Không dựng phiên Customer, không OTP, không dùng JWT Admin cho khách.

Đây là tài liệu Frontend. Backend `BE` tiếp tục chỉ đọc; không tự đổi controller, DTO, API, cấu hình, schema hoặc dữ liệu.

Database đã được người dùng xác nhận: SQL Server Docker tại `127.0.0.1:1433`, database `ChocoRobotDB`. Cấu hình kết nối runtime hiện tại ghi đè named instance trong appsettings; không chuyển database hoặc sửa connection string theo giá trị appsettings khi chạy luồng này.

## Hành vi có thể nối ngay bằng API thật

`POST /api/customers` công khai nhận đúng ba trường:

```json
{
  "fullName": "Tên khách hàng",
  "phone": "0901234567",
  "email": "customer@example.com"
}
```

Phản hồi201 thực tế theo hợp đồng:

```json
{
  "success": true,
  "message": "Contact information saved",
  "data": { "customerId": 27 },
  "errors": null
}
```

Các giá trị là ví dụ minh họa hợp đồng, không phải dữ liệu được chèn vào ứng dụng. DTO yêu cầu tên/email tối đa100 ký tự; số điện thoại8 đến15 chữ số với dấu+ tùy chọn. Đã có validation, rate limit và duplicate cooldown trên BE.

Phản hồi này chỉ chứng minh **đã lưu thông tin liên hệ**. Nó không tạo đơn hàng, lưu bản phối, giữ chỗ tồn kho, xác nhận thanh toán hoặc gửi lệnh robot. `customerId` dùng liên kết dữ liệu, không cấp quyền xem hồ sơ hoặc lịch sử đơn.

Frontend có thể giữ bản phối cục bộ và gọi `registerCustomer` bằng ba trường đã trim. Không gửi stroke/giá/role/customerId trong request này; DTO công khai không nhận các trường đó. Không đặt tiêu đề thành công là “Đặt hàng thành công”, “Đã thanh toán” hoặc “Robot đang xịt” chỉ dựa trên201 liên hệ.

## Khoảng trống hiện tại

| Nhu cầu checkout | API BE hiện có | Giới hạn |
| --- | --- | --- |
| Chọn dĩa và mẫu từ kho thật | `GET /api/plates`, `GET /api/choco-templates` | Chỉ Admin; khách chưa đăng nhập không được tải danh mục này |
| Tạo đơn | `POST /api/orders` với `{customerId,plateId,chocoTemplateId}` | Chỉ Admin, chỉ dùng dĩa/mẫu tồn tại; không có guest order endpoint |
| Lưu bản phối tùy chỉnh | Không có DTO/endpoint cho strokes, màu chocolate, độ dày hoặc góc xoay | Bản xem3D hiện chỉ ở trình duyệt; không được coi là thiết kế đã lưu trên server |
| Tạo G-code/chạy robot | Không có endpoint | URL G-code trong mẫu là tham chiếu tệp, không phải API tạo/chạy G-code |
| Thanh toán online | Không có tích hợp provider đã xác minh | VNPay/MoMo/ZaloPay bị từ chối khi chưa có tích hợp thật |
| Ghi nhận tiền mặt | `POST /api/payments`, chỉ Admin | Phải xác nhận `cashReceivedConfirmed=true` sau khi thực nhận đủ tiền của đơn; khách không tự đánh dấu đã nhận tiền |

Đơn Admin tạo bắt đầu Pending. Kho chỉ bị trừ khi chuyển Processing; Pending không có nghĩa đã giữ dĩa hoặc robot đã thực hiện. Giá lấy từ dĩa trên server, không lấy từ bản phối hoặc input client.

## Hợp đồng guest checkout cần được chốt nếu muốn tạo đơn thật

Các endpoint sau **chưa tồn tại**, chỉ là đề xuất để Backend xem xét trong công việc riêng được cho phép:

1. Cung cấp danh mục công khai đã lọc dữ liệu phù hợp, gồm dĩa còn hàng và mẫu hoạt động tương thích, hoặc tạo quote cho một lựa chọn hợp lệ. Không mở API quản trị đang có cho khách.
2. `POST /api/checkout` nhận liên hệ và lựa chọn thật; server kiểm tra và tạo contact/order trong một nghiệp vụ, tránh UI lưu liên hệ rồi nhầm là đã đặt đơn. Ví dụ cho mẫu có sẵn:

```json
{
  "contact": {
    "fullName": "Tên khách hàng",
    "phone": "0901234567",
    "email": "customer@example.com"
  },
  "plateId": 12,
  "chocoTemplateId": 34
}
```

Server xác minh type của dĩa/mẫu, trạng thái màu/mẫu, tồn kho và giá; client không tự gửi totalAmount/status. Phản hồi cần có id/orderCode/trạng thái/giá server thật. Khách vẫn không cần tài khoản. Nếu cần xem lại đơn, BE cần cơ chế tham chiếu đơn dành cho khách; không dùng email/phone hoặc customerId đơn thuần làm quyền đọc hồ sơ.

3. Nếu checkout phải nhận **chính bản phối khách vừa chỉnh**, cần thêm lựa chọn thiết kế tùy chỉnh thay vì chocoTemplateId có sẵn. Chốt cấu trúc draft có version, đường nét, đơn vị/tọa độ, giới hạn số stroke/điểm, màu/vật liệu, kích thước dĩa, kiểm tra vùng xịt và cách duyệt/chuyển sang tệp máy. Không tự biến JSON bản phối thành URL G-code hay gán templateId giả.
4. Nếu có thanh toán online, cần endpoint tạo phiên thanh toán/provider redirect và webhook xác minh server. Frontend chỉ hiển thị thành công sau trạng thái server đã xác minh; không tạo QR/tên giao dịch/số tiền đã trả giả. Với tiền mặt tại xưởng, trạng thái ban đầu chưa thanh toán và Admin ghi nhận sau khi thực nhận.
5. API robot cần công việc riêng nếu có yêu cầu máy thật: định danh thiết bị, bản thiết kế đã duyệt, trạng thái tác vụ và lỗi thực tế. Nút chạy mô phỏng3D không gọi hay giả xác nhận máy thật.

## Trạng thái UI đúng ở phiên này

- Public3D và checkout liên hệ không chặn bởi login Customer.
- Chỉ gọi API lưu liên hệ đang có; success copy nói rõ liên hệ đã lưu và giữ bản phối cục bộ.
- Nêu rõ chưa tạo đơn/chưa thanh toán khi BE chưa có guest checkout tương ứng; không tự gọi `/api/orders` bằng token Admin từ luồng khách.
- `RequestPanel` tạo đơn với mẫu có sẵn vẫn chỉ ở `/yeu-cau-xit` dành cho Admin, không tráo thành guest checkout.
- Không sửa BE, không tạo mock API và không biến dữ liệu minh họa preset3D thành dữ liệu catalog thật.
