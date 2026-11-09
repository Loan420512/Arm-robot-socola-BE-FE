# BE-SWD.Tests đang kiểm thử gì?

Đây là project kiểm tra dạng executable console, tham chiếu backend `BE-SWD`. Nó không dùng xUnit/NUnit và không được tự chạy khi bạn khởi động Backend hoặc mở Swagger. Không có Fake Repository hoặc InMemory database. Tất cả tiến trình API do bộ kiểm tra mở đều được tự dừng sau khi chạy.

## Phạm vi hiện có

| Nhóm | Nội dung thực sự kiểm tra |
|---|---|
| Quy tắc trạng thái | Các chuyển trạng thái đơn hàng hợp lệ, trạng thái kết thúc, không lặp xác nhận; quy tắc chuyển trạng thái incident; không dùng status refund cho order. Đây là kiểm tra hàm quy tắc, chưa kiểm tra trừ kho SQL. |
| EF mapping | Có 13 entity; tên cột password_hash; unique Payment.OrderId và Refund.PaymentId; nullable; không cascade delete; CHECK metadata lấy từ catalogue chung. SQL tạo schema chỉ được sinh thành chuỗi, không được thực thi. |
| Validation cơ bản | Mã HEX đúng/sai; kiểm tra định dạng hash BCrypt được sinh. Chưa kiểm chứng đăng nhập bằng mật khẩu lưu trong database thật. |
| Swagger/OpenAPI | Swagger UI trả HTTP thành công; controller/schema có mặt; đủ GET/POST/PUT/PATCH/DELETE; JWT Bearer Authorize; không lộ password hash; enum và yêu cầu xác nhận nhận tiền mặt được mô tả đúng. Mọi endpoint có Summary/Description, đúng tag admin.xxx và mô tả parameter; nhóm đúng thứ tự và error example dùng success=false. |
| Authorization/JWT | Từng method quản trị chặn anonymous; JWT role không hợp lệ trả 403; token hết hạn trả 401; token Admin hợp lệ được đi tới validation request. Token ở đây được ký cho kiểm tra, không phải kết quả đăng nhập Admin thật. |
| Validation HTTP | Login thiếu dữ liệu, phân trang sai, HEX sai, status sai module, thiếu hoặc false cashReceivedConfirmed, payment method lạ, thiếu isActive đều bị chặn trước SQL. |
| Lỗi database | Kết nối SQL cố ý không khả dụng trả 500 theo envelope; không lộ connection/stack trace; sản phẩm và dashboard không trả dữ liệu giả để che lỗi. |
| Cấu hình khởi động | Từ chối thiếu connection string, thiếu/secret ngắn, database sai tên và CORS wildcard. |
| User Secrets, tùy chọn | Khởi động bằng khóa JWT Development đã lưu trong User Secrets mà không truyền secret qua biến môi trường. |

## Cách chạy

Chạy từ thư mục chứa solution:

```powershell
dotnet run --project BE-SWD.Tests
```

Chế độ kiểm tra User Secrets đã cấu hình:

```powershell
dotnet run --project BE-SWD.Tests -- --development-user-secrets
```

Sau khi bổ sung kiểm tra Swagger documentation, chế độ thông thường hiện có 502 kiểm tra; chế độ User Secrets thêm một kiểm tra khi được bật. Bộ kiểm tra trả exit code khác 0 khi thất bại. Không dùng `dotnet test` cho harness hiện tại vì chưa tích hợp test adapter.

Để đối chiếu contract trước/sau refactor, có thể thêm `--snapshot-directory <thư-mục>`. Tùy chọn này lưu OpenAPI và SQL mapping được EF sinh ra, không ghi database. Các snapshot trong `.refactor-checks/` được bỏ qua bởi `.gitignore` và không được backend dùng làm response.

Nếu đang chạy Backend trong Visual Studio, có thể build output riêng bằng `--artifacts-path .swagger-checks` và chạy harness với `--api-assembly <đường-dẫn-BE-SWD.dll>`. Tùy chọn này chỉ thay assembly backend dùng trong kiểm tra, không sửa profile hoặc endpoint của project chính.

## Những gì chưa kiểm chứng

Chưa kiểm thử thành công CRUD SQL, đăng nhập/đổi mật khẩu/seed với tài khoản thật, cập nhật kho và transaction đồng thời/rollback, lưu payment/refund/audit, số liệu dashboard thực tế, tích hợp cổng thanh toán, chứng chỉ HTTPS hoặc ngưỡng rate limiting thực tế. CORS hiện mới được kiểm tra ở bước validate cấu hình wildcard.

Các kiểm tra HTTP dùng cổng loopback động và kết nối SQL không khả dụng, vì vậy không cần tạo/xóa database và không được hiểu là integration test dữ liệu SQL thành công.

## Có cần giữ project này không?

Nên giữ để phát hiện lỗi khi sửa Backend và Swagger. `BE-SWD` không tham chiếu project Tests; chỉ chiều Tests → Backend, nên việc giữ nó không thêm endpoint hoặc thay đổi Swagger/API. Phiên refactor giữ nguyên project này, không tạo project Tests mới và không xóa project hiện tại.
