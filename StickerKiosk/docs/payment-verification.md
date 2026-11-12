# Kiểm tra chức năng thanh toán

Ngày 12/11/2026, Asia/Saigon. Kiểm tra theo yêu cầu người dùng vì chưa thấy phần thanh toán.

## Kết luận

Trước lượt này, checkout `/thanh-toan-mau` chỉ có thông tin liên hệ và nút lưu contact. Không có bước tạo đơn hoặc giao dịch payment cho Customer. Phần thiếu là chức năng thật, không phải chỉ lỗi hiển thị: các API `/orders` và `/payments` hiện chỉ Admin, không có public checkout hay provider thanh toán online.

API payment hiện có chỉ ghi nhận Cash đã thực nhận: Admin phải gửi `cashReceivedConfirmed=true`, số tiền dương đúng tổng đơn, đơn chưa hủy và chưa có payment. Tạo payment hợp lệ ghi trạng thái Success, nên không được gọi nó chỉ để thử thanh toán cho một đơn thật khi chưa nhận tiền. VNPay/Momo/ZaloPay trong enum DTO không có nghĩa đã tích hợp provider; BusinessRules từ chối các phương thức này.

## Sửa Frontend

- Thêm khối **Thanh toán** trong checkout, phía trên biểu mẫu liên hệ, gồm giá dĩa hiện tại từ API, trạng thái **Chưa thu tiền**, mô tả tiền mặt tại xưởng và giới hạn thanh toán trực tuyến.
- Có lối vào **Dành cho nhân viên thu ngân → Mở ghi nhận thanh toán** tới `/quan-ly/payments?new=1`; route tiếp tục yêu cầu Admin. Nếu chưa đăng nhập, login giữ nguyên đường quay về.
- Sau khi Admin tạo đơn qua RequestPanel, thêm link sang ghi nhận tiền mặt. Không tự tạo payment hoặc tự chọn xác nhận đã nhận tiền.
- Gia cố validation FE: chỉ Cash; phải xác nhận thực nhận; số tiền hữu hạn, dương, bằng số tiền API của đơn; từ chối đơn đã hủy và thanh toán trùng. Không chuyển số tiền thiếu thành0.
- Gửi thông tin Customer vẫn chỉ lưu contact, không giả báo đặt đơn hoặc thanh toán thành công.

## Kết quả kiểm tra

| Kiểm tra | Kết quả |
| --- | --- |
| API GET payments / by-order khi chưa đăng nhập | 401 qua proxy FE→BE |
| API POST payments Cash và online khi chưa đăng nhập | 401; không có record được tạo |
| API POST orders chưa đăng nhập | 401 |
| Harness BE độc lập | 553 checks đạt; dùng SQL cố ý không khả dụng và secret kiểm thử riêng, không dùng Docker DB cho ghi dữ liệu |
| Receipt confirmation | Harness chặn thiếu/false `cashReceivedConfirmed` trước SQL |
| Payment method | Harness chặn phương thức không hợp lệ; source BusinessRules chỉ cho Cash thực nhận |
| FE validation | Đúng tiền và xác nhận Cash được chấp nhận; sai tiền, thiếu xác nhận, null/0/âm/NaN/Infinity, đơn hủy, trùng payment hoặc VNPay bị từ chối |
| Tổng FE tests | 104/104 đạt trong7files |
| Build / TypeScript / lint | Đạt; cảnh báo bundle Three.js lớn vẫn có từ trước |
| Playwright checkout | Chọn mẫu HappyBirthday + dĩa PLATE-001 qua API, nút tiếp tục mở checkout; khối Thanh toán hiện50.000đ và Chưa thu tiền |
| Playwright thu ngân | Link mở login Admin và giữ `from=/quan-ly/payments?new=1` |
| Mobile390px | Khối thanh toán hiển thị, không tràn ngang |
| Console | Không có JS error/warning trong luồng UI đã kiểm tra |

Screenshots: `output/playwright/payment-section-desktop.png`, `payment-section-mobile.png`. Log harness: `C:/Users/thong/AppData/Local/Temp/chocorobot-payment-validation-checks.log`.

## Giới hạn và dữ liệu sau kiểm tra

Chưa có phiên Admin thật được cung cấp cho lượt này, nên chưa kiểm chứng thành công tạo payment qua UI/SQL. Không tạo JWT dùng vào ứng dụng thật, không reset credential, không đánh dấu đơn đã thanh toán để hoàn thành test.

Trước và sau kiểm tra: PAYMENT0, ORDER1, CUSTOMER3, stock PLATE-001100. Không thay dữ liệu này hoặc sửa source/config/schema Backend. Customer3 là dữ liệu có sẵn khi bắt đầu lượt kiểm tra; không phải contact tạo trong lượt này.

## Phạm vi cần phê duyệt để hoàn thiện guest checkout

Yêu cầu gốc giữ Backend chỉ đọc, các ngoại lệ trước chỉ mở GET catalog/bố cục. Để Customer đặt đơn mà không đăng nhập, cần thêm public API checkout, không thể chỉ mở công khai `/payments`.

Đề xuất tối thiểu để review: `POST /api/checkout` nhận `{fullName,phone,email,plateId,chocoTemplateId}`; server xác thực mẫu/dĩa/giá/tồn kho, lưu contact và tạo đơn Pending trong một transaction, trả receipt `{orderId,orderCode,totalAmount,paymentStatus:'AwaitingCash'}`. Không ghi PAYMENT.Success cho đến Admin xác nhận tiền mặt thực nhận. Không tin amount/status do trình duyệt gửi. Cần quy định chống gửi lặp và trả receipt an toàn cho guest; dữ liệu riêng tư của khách/đơn không được mở public list.

Đây là hợp đồng đề xuất, chưa có trong BE. Thanh toán online cần chọn provider và có xác minh giao dịch server/webhook riêng; không thêm lựa chọn hoặc nút báo thành công giả.

Branch vẫn `fe`, BE vẫn `BE`. Không commit/push. Các6file Backend thay đổi từ các ngoại lệ GET đã được cho phép trước giữ nguyên, không sửa thêm trong lượt payment này.
