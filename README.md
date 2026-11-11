# ChocoRobot Backend

Swagger hiện có Summary/Description cho 78 endpoint và 15 nhóm `admin.xxx`; xem [báo cáo Swagger và danh sách file](SWAGGER-DOCUMENTATION-REPORT.md). Nếu đang debug bản cũ trong Visual Studio, Stop Debugging rồi F5 để nạp thay đổi.

Đã refactor mã nguồn để dễ đọc; xem [báo cáo và danh sách file](REFACTOR-REPORT.md). Phạm vi kiểm tra của project hiện có được giải thích tại [BE-SWD.Tests/README.md](BE-SWD.Tests/README.md).

Nếu gặp lỗi khởi động `The Secret field is required`, xem [hướng dẫn cấu hình và khởi động](STARTUP.md). Có thể tạo khóa Development ngoài Git bằng `scripts/Initialize-DevelopmentSecrets.ps1`.

Đã chuyển project Console `BE-SWD` hiện tại thành ASP.NET Core Web API; giữ .NET 8 để tương thích project ban đầu. Không tạo backend thứ hai. Máy có SDK .NET 10 và runtime .NET 8 nên build và chạy được target này.

## Cấu trúc và package

```text
BE-SWD.slnx
BE-SWD/
  Controllers/                 15 controller: Auth, Dashboard và 13 bảng
  Models/Entities/             13 entity + IEntity
  DTOs/                        DTO riêng cho 13 bảng, Auth và Dashboard
  Data/                        DbContext, Fluent API và check constraint metadata
  Interfaces/Repositories/     IRepository, IBusinessRepository
  Interfaces/Services/         ICrudService
  Repositories/                Repository dùng chung và unit of work liên bảng
  Services/                    CrudService, BusinessRules, Auth, Payment, Dashboard
  Common/                      Constants, validation chung, ApiResponse, phân trang
  Configuration/               JwtOptions, SecurityOptions, ReportingOptions
  Middleware/                  Xử lý exception tập trung
  Helpers/                     Swagger response documentation
  Sql/                         Migration role thủ công, không tự chạy
  Properties/launchSettings.json
  Program.cs
  appsettings.json
  appsettings.Development.json
BE-SWD.Tests/                  Bộ kiểm tra executable, không cần test framework ngoài
```

Luồng xử lý: Controller → Service → Repository → DbContext → SQL Server. CRUD dùng generic service/repository với DTO cụ thể từng module. Các nghiệp vụ nhiều bảng dùng chung repository và transaction Serializable. Không có InMemory, dữ liệu giả, tự tạo database hoặc tự chạy migration.

Package đã restore từ cache local:

| Package | Phiên bản |
|---|---|
| Microsoft.EntityFrameworkCore.SqlServer | 8.0.10 |
| Microsoft.AspNetCore.Authentication.JwtBearer | 8.0.10 |
| BCrypt.Net-Next | 4.2.0 |
| Swashbuckle.AspNetCore | 6.6.2 |

## Cấu hình SQL Server và JWT

Kiểm tra thực tế: SQL Server `localhost` chấp nhận Windows authentication nhưng truy vấn `sys.databases` không tìm thấy `ChocoRobotDB`. Workspace không có SQL script gốc. Vì vậy chưa scaffold Database First được. Mapping được dựng từ mô tả yêu cầu, chưa đối chiếu schema thật. Những cột không được mô tả rõ NOT NULL được giữ nullable; tên constraint metadata là tên quy ước, chưa xác nhận tên trong database thật.

Cần cung cấp database đúng schema hoặc trỏ đến instance có sẵn. Ứng dụng không tự tạo database. Connection string không còn được lưu trong repo; bắt buộc cấp bằng Environment Variables hoặc User Secrets. Ứng dụng từ chối khởi động nếu thiếu connection string, thiếu JWT secret hoặc connection string trỏ đến database khác ChocoRobotDB. Ví dụ cấu hình môi trường local (chỉ là hướng dẫn, không được ứng dụng tự sử dụng):

```powershell
$env:ConnectionStrings__DefaultConnection = 'Server=localhost;Database=ChocoRobotDB;Trusted_Connection=True;TrustServerCertificate=True;Connect Timeout=5'
$env:Jwt__Secret = [Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(48))
```

JWT cần secret ít nhất 32 byte; ứng dụng từ chối khởi động khi thiếu. Lưu secret ổn định trong secret store khi triển khai; việc tạo secret mới làm token cũ hết hiệu lực. Không commit secret hoặc mật khẩu SQL. Production nên bật kiểm tra chứng chỉ SQL hợp lệ và cấu hình danh sách `Cors:Origins` cụ thể; mặc định Production không cho origin nào.

Project có `UserSecretsId` để hỗ trợ `dotnet user-secrets` trong Development; repo chỉ lưu identifier, không lưu giá trị secrets. Cả Development và Production đều có danh sách CORS mặc định rỗng. Cấp origin thực tế bằng `Cors__Origins__0`, `Cors__Origins__1`, v.v.; wildcard bị từ chối. Có thể đổi thời hạn token (`Jwt__LifetimeSeconds`), sai lệch đồng hồ (`Jwt__ClockSkewSeconds`), BCrypt cost (`Security__BcryptWorkFactor`), rate limit (`Security__LoginPermitLimit`, `Security__LoginWindowSeconds`), giới hạn top plates (`Reporting__TopPlatesLimit`). Các cấu hình này được validate khi khởi động.

Địa chỉ/port local chỉ nằm trong `Properties/launchSettings.json`, không có trong logic C#. Để dùng địa chỉ cấu hình riêng, đặt `ASPNETCORE_URLS` và chạy `dotnet run --project BE-SWD --no-launch-profile`. Không có origin frontend hoặc connection string localhost mặc định trong appsettings.

## Tạo Admin ban đầu

Chỉ thực hiện sau khi database có đủ bảng. Không có endpoint đăng ký công khai. Bootstrap chỉ thêm tài khoản nếu toàn bộ bảng ADMIN chưa có bản ghi, không sửa tài khoản cũ.

```powershell
$env:Bootstrap__Username = Read-Host 'Tên đăng nhập Admin'
$securePassword = Read-Host 'Mật khẩu Admin: ít nhất 12 ký tự, tối đa 72 UTF-8 bytes' -AsSecureString
$env:Bootstrap__Password = [Net.NetworkCredential]::new('', $securePassword).Password
$env:Bootstrap__Email = Read-Host 'Email Admin'
dotnet run --project BE-SWD --launch-profile https
```

Sau lần khởi tạo, xóa các biến Bootstrap khỏi môi trường và khởi động lại. Nếu có tài khoản cũ với role khác Admin, đăng nhập bị từ chối; không tự đổi role hoặc reset mật khẩu. File `BE-SWD/Sql/001_AdminRoleConstraint.manual.sql` chỉ dành cho review và chạy thủ công: dừng và liệt kê tài khoản không tương thích, không chỉnh dữ liệu. Script không được ứng dụng tự thực thi.

## Chạy và dùng Swagger

Tại thư mục chứa solution:

```powershell
dotnet restore BE-SWD.slnx
dotnet build BE-SWD.slnx
dotnet dev-certs https --trust
dotnet run --project BE-SWD --launch-profile https
```

Profile cấu hình HTTPS tại https://localhost:7143/swagger và HTTP tại http://localhost:5143/swagger. Máy chưa có chứng chỉ HTTPS development hợp lệ tại thời điểm kiểm tra, nên HTTPS chưa được xác minh. Trong kiểm tra tự động, Swagger UI và OpenAPI đã chạy thành công trên cổng HTTP loopback được cấp động; tiến trình test tự dừng khi xong. Bố cục Swagger tiêu chuẩn được giữ nguyên, enum hợp lệ được lấy từ cùng catalogue của validation và CHECK metadata.

Trong Swagger, mở `POST /api/auth/login`, bấm **Try it out**, nhập tài khoản Admin đã lưu và **Execute**. Sao chép `data.accessToken`, bấm **Authorize**, dán token JWT thuần (không cần thêm `Bearer ` vì Swagger dùng HTTP bearer scheme). Token có hạn 3600 giây. Dùng `GET /api/auth/me` để kiểm tra. `POST /api/auth/change-password` nhận `currentPassword`, `newPassword`. Không trả password hash ra API hoặc Swagger.

Chỉ login được phép anonymous. Tất cả API khác yêu cầu JWT với role Admin. Login giới hạn 10 lần/phút theo địa chỉ IP. Chỉ cấu hình forwarded headers từ proxy đáng tin cậy nếu triển khai sau proxy.

## Endpoint

| Nhóm | Endpoint |
|---|---|
| Auth | POST `/api/auth/login`, GET `/api/auth/me`, POST `/api/auth/change-password` |
| Admin | GET, POST `/api/admin`; GET, PUT, DELETE `/api/admin/{id}` |
| Customer (public) | POST `/api/customers` — fullName, phone, email; no JWT; returns customerId only |
| Customer (Admin JWT) | GET, POST `/api/admin/customers`; GET, PUT, DELETE `/api/admin/customers/{id}` |
| Staff | GET, POST `/api/staff`; GET, PUT, DELETE `/api/staff/{id}`; PATCH `/api/staff/{id}/status` |
| PlateType | GET, POST `/api/plate-types`; GET, PUT, DELETE `/api/plate-types/{id}` |
| PlateColor | GET, POST `/api/plate-colors`; GET, PUT, DELETE `/api/plate-colors/{id}`; PATCH `/api/plate-colors/{id}/status` |
| Plate | GET, POST `/api/plates`; GET, PUT, DELETE `/api/plates/{id}`; GET `/api/plates/by-color/{id}`, `/api/plates/by-type/{id}` |
| ChocoTemplate | GET, POST `/api/choco-templates`; GET, PUT, DELETE `/api/choco-templates/{id}`; GET `/api/choco-templates/by-plate-type/{id}` |
| TemplateElement | GET, POST `/api/template-elements`; GET, PUT, DELETE `/api/template-elements/{id}`; GET `/api/template-elements/by-template/{id}` |
| Order | GET, POST `/api/orders`; GET, PUT `/api/orders/{id}`; PATCH `/api/orders/{id}/status`; GET `/api/orders/by-customer/{id}` |
| Payment | GET, POST `/api/payments`; GET `/api/payments/{id}`, `/api/payments/by-order/{id}` |
| Refund | GET, POST `/api/refunds`; GET `/api/refunds/{id}`; PATCH `/api/refunds/{id}/approve`, `/api/refunds/{id}/reject` |
| Incident | GET, POST `/api/incident-reports`; GET, PUT `/api/incident-reports/{id}`; PATCH `/api/incident-reports/{id}/status` |
| Audit | GET, POST `/api/cash-flow-audits`; GET, PUT `/api/cash-flow-audits/{id}` |
| Dashboard | GET `/api/dashboard/overview`, `/revenue`, `/orders-statistics`, `/top-plates`, `/payment-statistics` (cùng prefix `/api/dashboard`) |

Danh sách CRUD hỗ trợ `pageNumber=1`, `pageSize=10` (tối đa 100), `search`, `sortBy` (tên property DTO/entity, không cho password hash), `descending`. Màu có `isActive`; plate có `colorId`, `typeId`, `minPrice`, `maxPrice`, `inStock`; các danh sách liên quan có `plateTypeId`, `templateId`, `customerId`. Search customer áp dụng tên, số điện thoại, email. Các truy vấn đọc dùng AsNoTracking. Route theo FK cũng phân trang. Dashboard là tổng hợp, không phân trang; top plates giới hạn 10.

PATCH status nhân viên/màu dùng `{ "isActive": true }`; order/incident dùng `{ "status": "Processing" }` với trạng thái phù hợp module. Approve/reject không cần body. POST trả 201, DELETE/PATCH thành công trả 204 không body; lỗi dùng envelope thống nhất, status 400/401/403/404/409/500. Rate limit trả 429 theo middleware ASP.NET Core.

## Quy tắc nghiệp vụ và giới hạn schema

- Mỗi order đại diện đúng một dĩa, không có quantity/order details. Giá lấy từ plate tại thời điểm tạo/cập nhật Pending. Chỉ sửa nội dung đơn Pending. Chuyển hợp lệ: Pending → Processing/Cancelled; Processing → Completed/Cancelled. Completed và Cancelled là trạng thái cuối.
- Tạo Pending kiểm tra kho nhưng chưa giữ kho. Pending → Processing trừ một đơn vị trong transaction Serializable; Processing → Cancelled trả một đơn vị. Lặp lại cùng chuyển trạng thái bị từ chối. Không thể đảm bảo giữ hàng cho đơn Pending vì schema không có trường đặt trước.
- Plate trả tên loại, hình dạng, kích thước, tên màu và HEX. `color` legacy được đồng bộ từ `color_id`; đổi tên màu cũng đồng bộ plate liên quan. Không xóa bản ghi được FK tham chiếu.
- Admin không được xóa chính mình. CRUD Admin yêu cầu mật khẩu khi tạo/cập nhật và luôn hash BCrypt; role do server đặt Admin. Các trường nội bộ không nằm trong write DTO.
- POST payment là ghi nhận **tiền mặt đã được Admin xác nhận nhận**; bắt buộc gửi `cashReceivedConfirmed: true`. Thiếu hoặc false bị từ chối trước khi truy cập SQL; không có xác nhận mặc định. Chỉ Cash được ghi Success; VNPay/Momo/ZaloPay bị từ chối khi chưa có provider verifier. Không có webhook giả. Một order chỉ một payment, không trả trùng, không thanh toán đơn Cancelled; số tiền phải bằng giá trị đơn và lớn hơn 0. Payment Failed cũ không thể tạo payment thứ hai theo unique constraint hiện tại. `auditId` tùy chọn cho payment và refund, phù hợp FK nullable.
- Refund phải gắn Payment Success, số tiền lớn hơn 0 và không vượt thanh toán; một payment chỉ một refund. Approve/reject chỉ từ Pending. Approve không chuyển Payment sang Refunded. Chưa có cổng thực thi/xác nhận tiền hoàn thật; không có API tự đánh dấu đã hoàn tiền.
- Dashboard và audit chỉ trừ refund thực tế khi Payment đã có trạng thái Refunded trong dữ liệu được xác nhận từ bên ngoài; refund Approved đơn thuần không bị tính là tiền đã trả. Failed bị loại khỏi doanh thu. Revenue là tổng Success + Refunded trừ refund đã xác nhận, giữ lại phần tiền còn lại của partial refund.
- Audit nhận `auditDate`, `expectedRevenue` (doanh thu ròng), `expectedRefund` để so với tổng tính từ SQL và phân loại Matched/Discrepancy. Không cho client ghi trực tiếp tổng hoặc kết quả.
- Schema không có `refunded_at` hoặc trạng thái executed của refund, nên báo cáo refund theo ngày được quy về ngày thanh toán gốc; chưa thể đối soát đúng ngày hoàn trả thực tế. Dashboard dùng datetime hiện có, không suy diễn múi giờ cho dữ liệu lịch sử.
- Chưa tích hợp sinh G-code/điều khiển robot; chỉ lưu URL như yêu cầu.
- Role, route, status, phương thức thanh toán và catalogue hợp lệ nằm trong `Common/SystemConstants.cs`. Chuỗi lặp trong Controller/Service/DbContext đã được thay bằng constants. Các danh sách ở đây là định nghĩa hệ thống, không phải dữ liệu sản phẩm/khách hàng/màu mẫu. CHECK metadata của EF được dựng từ cùng catalogue và không tự áp dụng vào database.
- Incident chỉ được tạo với Open và chuyển Open → In Progress/Resolved, In Progress → Resolved; PUT cũng không được bỏ qua quy tắc chuyển trạng thái. PATCH bật/tắt staff hoặc màu bắt buộc có `isActive`, không ngầm chuyển false khi thiếu field.

## Kiểm tra đã thực hiện

```powershell
dotnet run --project BE-SWD.Tests/BE-SWD.Tests.csproj
```

Đây là executable test harness gồm kiểm tra đơn vị/mapping và tích hợp HTTP thật, thất bại trả exit code khác 0. Không dùng database giả. Không chạy bằng `dotnet test` vì không phụ thuộc test framework ngoài. HTTP tests tự khởi động API bằng secret ngẫu nhiên dùng một lần và cổng loopback động, tự dừng sau kiểm tra. SQL failure test dùng endpoint SQL không khả dụng, vẫn chỉ định ChocoRobotDB và không tạo hoặc ghi database. Giá trị minh họa trong test chỉ là input kiểm tra, không được đăng ký làm nguồn dữ liệu hoặc trả về từ API.

Kết quả mới nhất được lưu trong `TEST-RESULTS.txt`, gồm state machine, mapping 13 bảng, unique payment/refund, nullable, không cascade delete, HEX, BCrypt, Swagger/OpenAPI, bảo vệ mọi method quản trị với anonymous, JWT sai role/hết hạn, validation authenticated, xác nhận tiền mặt, từ chối cấu hình không an toàn và SQL exception sanitization. Có kiểm tra API sản phẩm/dashboard trả lỗi khi SQL không khả dụng, thay vì trả dữ liệu giả hoặc thống kê cố định. **Đây không phải kiểm chứng thành công CRUD hoặc đăng nhập với database thật.**

`dotnet restore` API và `dotnet build` API đã thành công. Build API gần nhất không warning/error. Restore test có cảnh báo NU1900 vì môi trường không truy cập được nguồn dữ liệu kiểm tra lỗ hổng NuGet; chưa hoàn tất kiểm tra vulnerability của package.

Chưa kiểm chứng: scaffold/schema thật, login Admin thật, seed vào database, CRUD đọc/ghi SQL, giao dịch đồng thời/rollback thực tế, dữ liệu dashboard và audit, constraint hiện có, HTTPS. Cần ChocoRobotDB đúng schema và chứng chỉ local để hoàn tất các bước này. Không có database nào bị tạo, xóa hoặc đổi schema trong phiên triển khai.

Public contact submission does not verify identity, email or phone ownership. customerId is an order reference, never proof of ownership. CustomerRegistration settings control per-IP/global rate limits and duplicate cooldown. Limits and the bounded hashed-contact cooldown cache are per backend process; deployments with multiple instances should enforce a shared limit at the gateway. Do not trust client-supplied forwarding headers; configure trusted proxies explicitly if deployed behind one. SQL Server supplies CUSTOMER.id and created_at; no schema changes or migrations are performed.

