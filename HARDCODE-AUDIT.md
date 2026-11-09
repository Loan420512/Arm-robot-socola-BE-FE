# Báo cáo rà soát hardcode ChocoRobot

Đã chỉnh sửa trực tiếp backend. Không tìm thấy danh sách khách hàng, nhân viên, dĩa, màu, mẫu thiết kế, đơn hàng hoặc doanh thu giả trong nguồn dữ liệu API. Không có Fake Repository, mock provider hoặc InMemory database được đăng ký vào DI. CRUD vẫn đi qua EF Core SQL Server và repository thật; dashboard tổng hợp từ dữ liệu truy vấn SQL.

| Vị trí | Thay đổi |
|---|---|
| `Common/SystemConstants.cs` | Tập trung duy nhất role Admin; route; các status hợp lệ; payment methods; staff positions; HEX/password/pagination validation; response messages dùng chung. Catalogue immutable chỉ mô tả định nghĩa hệ thống. |
| Toàn bộ `Controllers/` | Thay role và route literal bằng constants. Không chứa trạng thái nghiệp vụ hoặc số liệu mẫu. |
| `Services/AuthService.cs` | Token lifetime/issuer/audience/secret và BCrypt cost lấy cấu hình. Admin lấy từ SQL. Bootstrap chỉ dùng cấu hình được cung cấp, không có tài khoản/mật khẩu mặc định. |
| `Services/BusinessRules.cs`, `CrudService.cs` | Loại status/role/payment method literal; kiểm tra catalogue và chuyển trạng thái. Cash phải được Admin xác nhận đã thực nhận. Incident có quy tắc chuyển trạng thái ở cả PATCH và PUT. |
| `Services/DashboardService.cs` | Giữ các truy vấn tổng hợp từ SQL; dùng status constants; giới hạn top plates lấy ReportingOptions. Không trả số liệu cố định khi SQL lỗi. |
| `Data/ChocoRobotDbContext.cs`, `SchemaChecks.cs` | Default trạng thái và CHECK metadata dùng cùng constants/catalogue với service và validation. Không chạy migration hoặc đổi schema. |
| `DTOs/`, `Common/BusinessValidation.cs` | HEX/password dùng quy tắc chung; payment method, staff position, incident/order status dùng validator catalogue. PATCH active yêu cầu trường rõ ràng. `auditId` payment/refund giữ tùy chọn theo nullable FK. |
| `Helpers/BusinessValueSchemaFilter.cs` | Swagger mô tả enum từ validation thật; không có endpoint/response giả. Giữ Swagger tiêu chuẩn và JWT Authorize. |
| `Program.cs`, `Configuration/RuntimeOptions.cs` | Bắt buộc connection string và JWT secret từ cấu hình ngoài; validate tên DB ChocoRobotDB, tham số bảo mật và CORS. Không có connection-string fallback, wildcard CORS hoặc địa chỉ frontend/backend trong logic. |
| `appsettings.Development.json` | Xóa connection string localhost và các origin frontend mẫu; CORS mặc định rỗng. |
| `appsettings.json`, project file | Chỉ giữ cấu hình hoạt động không nhạy cảm; thêm UserSecretsId. Không commit JWT secret, mật khẩu hoặc API key. |
| `BE-SWD.Tests/Program.cs` | Cổng HTTP và subject kiểm tra được cấp động; token test dùng secret ngẫu nhiên. Kiểm tra SQL failure không dùng DB giả, không đọc/ghi bảng thật. |

## Phân biệt constants và dữ liệu thật

Role, route, valid status, SQL table/column/type, regex và các giới hạn kỹ thuật là định nghĩa hệ thống được phép tập trung thành constants. Các giá trị mặc định Pending/Open, trạng thái tạo refund và giới hạn phân trang là quy tắc nghiệp vụ rõ ràng. Chúng không thay thế dữ liệu SQL.

Connection string minh họa trong README chỉ là hướng dẫn, không được logic ứng dụng đọc hoặc sử dụng làm fallback. Địa chỉ local trong `Properties/launchSettings.json` là cấu hình profile Development và có thể được thay bằng `ASPNETCORE_URLS` với `--no-launch-profile`.

`cashReceivedConfirmed: true` là lời xác nhận của Admin rằng tiền mặt đã thực nhận; API không xác minh tiền mặt qua phần cứng. Các nhà cung cấp online chưa có verifier nên không được ghi Success. Approve refund không ghi Payment thành Refunded và không giả lập tiền đã hoàn.

## Kiểm chứng và phần còn thiếu

- Đã chạy `dotnet restore`, `dotnet build` và executable test harness; xem `TEST-RESULTS.txt`.
- Đã kiểm tra Swagger/OpenAPI có GET, POST, PUT, PATCH, DELETE và JWT Authorize; valid enums khớp catalogue; bảo vệ mọi API quản trị.
- Đã kiểm tra thiếu connection/secret, secret ngắn, sai tên database và CORS wildcard đều bị từ chối khi khởi động.
- Đã kết nối SQL Server localhost bằng truy vấn chỉ đọc `sys.databases`; không có database tên ChocoRobotDB hiển thị cho tài khoản hiện tại. Không có cấu hình kết nối instance khác trong môi trường phiên làm việc.
- Chưa kiểm chứng CRUD thành công, đăng nhập tài khoản thật, tồn kho/transaction đồng thời hoặc số liệu tài chính với dữ liệu thật do thiếu database. Không tạo, xóa hoặc sửa database/schema để vượt qua trở ngại này.
- CHECK metadata vẫn dựa trên schema mô tả ban đầu; chưa đối chiếu constraint/schema thật. HTTPS chưa được xác minh do chưa có chứng chỉ Development hợp lệ ở lần kiểm tra trước.
- Restore/build test project còn cảnh báo NU1900: không truy cập được nguồn kiểm tra vulnerability NuGet. Không thay package hoặc tắt audit để che cảnh báo.
