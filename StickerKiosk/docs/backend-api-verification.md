# Backend BE: kết quả kiểm tra chỉ đọc và API contract

> Báo cáo audit ban đầu. Sau đó người dùng đã cho phép mở công khai4GETcatalog; xem kết quả cập nhật trong [api-only-integration.md](api-only-integration.md). Các ghi nhận401vàBEkhôngđổi bên dưới là trạng thái trước ngoại lệ được phê duyệt.

Ngày kiểm tra: **12/11/2026**, múi giờ Asia/Saigon. Đây là tài liệu thuộc Frontend trên branch `fe`; không phải thay đổi Backend.

## 1. Git và trạng thái chạy

| Hạng mục | Kết quả thực tế |
| --- | --- |
| Backend checkout | `C:/Users/thong/.codex/worktrees/run-chocorobot-be/SWD-BE` |
| Branch | `BE` viết hoa |
| Commit | `2e6f800dd0b554e0629c5495445c8f3f336be913` |
| Pull | `git pull --ff-only origin BE`: `Already up to date.` |
| Working tree trước/sau | `git status --porcelain` rỗng |
| Kiểm tra diff cuối | `git diff --quiet`: exit code `0` |
| API HTTP | `http://127.0.0.1:5143` |
| Process | Backend đã chạy sẵn, `dotnet` PID `16628`; giữ tiến trình chạy, không khởi động bản thứ hai |
| .NET | SDK `8.0.428`, runtime `8.0.34`; executable tại `C:/Users/thong/.dotnet/dotnet.exe` |
| Dependency | Binary/package output đã có và ứng dụng hoạt động; không cần cài thêm |
| Cấu hình | User Secrets có JWT secret đủ tối thiểu 32 byte và connection string; không đổi giá trị |
| Swagger UI | `GET /swagger/index.html`: `200` |
| OpenAPI | `GET /swagger/v1/swagger.json`: `200`, **80 operations**, trong đó **38 GET** |

README Backend còn ghi 78 endpoint; con số 80 ở đây được đếm từ OpenAPI đang chạy. Không chỉnh README Backend.

`dotnet` chưa nằm trong PATH của shell hiện tại, nhưng executable và runtime đã có. Không thay PATH hoặc cấu hình máy.

## 2. Database

SQL Server đang chạy trong Docker container `chocorobot-sql`, publish tại `127.0.0.1:1433`. Truy vấn chỉ đọc xác nhận database **ChocoRobotDB** có đủ **13 bảng**:

| Bảng | Số bản ghi khi kiểm tra |
| --- | ---: |
| ADMIN | 1 |
| CASH_FLOW_AUDIT | 0 |
| CHOCO_TEMPLATE | 0 |
| CUSTOMER | 0 |
| INCIDENT_REPORT | 0 |
| ORDER | 0 |
| PAYMENT | 0 |
| PLATE | 0 |
| PLATE_COLOR | 0 |
| PLATE_TYPE | 0 |
| REFUND_TRANSACTION | 0 |
| STAFF | 0 |
| TEMPLATE_ELEMENT | 0 |

Bản ghi Admin hiện có hash đúng cấu trúc BCrypt: độ dài 60 ký tự và prefix phù hợp. Đây chỉ là kiểm tra cấu trúc, không xác nhận mật khẩu. Báo cáo Backend cũ về hash hỏng không phản ánh hiện trạng này.

Login bằng username kiểm tra chắc chắn không tồn tại trả `401 Invalid username or password`, thay vì lỗi SQL. Kết hợp với đường thực thi AuthService có truy vấn repository, đây là bằng chứng API truy cập database thành công. Không tạo account, seed, chạy migration, INSERT, UPDATE hoặc DELETE.

Các bảng nghiệp vụ rỗng là dữ liệu thực tế. Frontend cần hiển thị empty state, không thay bằng số liệu hoặc sản phẩm giả. Kiểm tra metadata/kết nối này chưa chứng minh CRUD và transaction hoạt động đầy đủ.

## 3. HTTP đã kiểm tra

| Request | Kết quả |
| --- | --- |
| `GET /swagger/index.html` | `200` |
| `GET /swagger/v1/swagger.json` | `200`, tài liệu OpenAPI thật |
| Toàn bộ 38 GET trong OpenAPI, không token | Tất cả `401` với envelope xác thực |
| `GET /api/auth/me`, `Authorization: Bearer invalid-token-readonly-probe` | `401` |
| `POST /api/auth/login`, username `__readonly_probe_missing__` và mật khẩu probe không hợp lệ | `401 Invalid username or password` |
| `POST /api/auth/login`, JSON `{}` | `400`, thiếu Username/Password |
| `POST /api/customers`, JSON `{}` | `400`, thiếu FullName/Phone/Email |
| OPTIONS `/api/auth/login`, Origin `http://localhost:5173` | `204`, không có `Access-Control-Allow-Origin` |

Các GET có `{id}` được gọi với `2147483647`. Vì không có token, request bị chặn tại xác thực; kết quả này kiểm tra bảo vệ route, chưa kiểm tra đọc dữ liệu sau đăng nhập.

Ví dụ body `401` thực tế khi thiếu hoặc sai token:

```json
{
  "success": false,
  "message": "Authentication required",
  "data": null,
  "errors": null
}
```

Ví dụ `400` thực tế từ `POST /api/auth/login` với `{}`:

```json
{
  "success": false,
  "message": "Validation failed",
  "data": null,
  "errors": {
    "Password": ["The Password field is required."],
    "Username": ["The Username field is required."]
  }
}
```

Ví dụ `400` thực tế từ `POST /api/customers` với `{}`:

```json
{
  "success": false,
  "message": "Validation failed",
  "data": null,
  "errors": {
    "Email": ["The Email field is required."],
    "Phone": ["The Phone field is required."],
    "FullName": ["The FullName field is required."]
  }
}
```

## 4. Authentication và đăng ký thông tin liên hệ

Các API quản trị yêu cầu JWT với role **Admin**. Chưa có account registration công khai, đăng nhập Customer hoặc đăng nhập Staff trong contract hiện tại.

| Request | Request body / response contract |
| --- | --- |
| `POST /api/auth/login` | `{ username, password }`; thành công trả `data: { accessToken, tokenType, expiresIn, user: { id, username, email, role } }` |
| `GET /api/auth/me` | Bearer token; trả `data: { id, username, email, role }` |
| `POST /api/auth/change-password` | Bearer token, `{ currentPassword, newPassword }` |
| `POST /api/customers` | Công khai, chỉ `{ fullName, phone, email }`; thành công `201`, `data: { customerId }` |
| `/api/admin/customers` | CRUD khách hàng quản trị, cần JWT Admin |

Public `/api/customers` chỉ lưu **thông tin liên hệ cho đơn hàng**, không tạo tài khoản hay mật khẩu, không kiểm chứng quyền sở hữu email/số điện thoại. `customerId` không phải bằng chứng danh tính hoặc quyền xem bản ghi. Có giới hạn tần suất và cooldown; có thể nhận `429`.

Phân biệt route `/api/customers` và `/api/admin/customers`: không dùng public endpoint để tải danh sách hoặc sửa khách hàng quản trị.

## 5. Envelope và phân trang

Response chung:

```text
{ success: boolean, message: string, data: T | null, errors: object | null }
```

Danh sách phân trang:

```text
data: { items: T[], pageNumber: number, pageSize: number,
        totalCount: number, totalPages: number }
```

Query chung: `pageNumber` mặc định 1, `pageSize` mặc định 10 và tối đa 100, `search`, `sortBy`, `descending`. Filter theo tài nguyên gồm `colorId`, `typeId`, `plateTypeId`, `templateId`, `customerId`, `isActive`, `inStock`, `minPrice`, `maxPrice`.

POST CRUD thành công trả `201`. DELETE/PATCH thành công trả `204` không body. Frontend cần xử lý body rỗng, lỗi envelope `400/401/403/404/409/500`, và `429`; không mặc định mọi response đều có JSON.

Các contract thành công dưới đây được đối chiếu source DTO và OpenAPI thật; **chưa nhận response thành công bằng account thật** trong phiên kiểm tra này.

## 6. Resource API

Prefix các route trong bảng là `/api`.

| Nhóm | Route và method |
| --- | --- |
| Admin | GET/POST `/admin`; GET/PUT/DELETE `/admin/{id}` |
| Customer quản trị | GET/POST `/admin/customers`; GET/PUT/DELETE `/admin/customers/{id}` |
| Staff | GET/POST `/staff`; GET/PUT/DELETE `/staff/{id}`; PATCH `/staff/{id}/status` |
| Loại dĩa | GET/POST `/plate-types`; GET/PUT/DELETE `/plate-types/{id}` |
| Màu dĩa | GET/POST `/plate-colors`; GET/PUT/DELETE `/plate-colors/{id}`; PATCH `/plate-colors/{id}/status` |
| Dĩa | GET/POST `/plates`; GET/PUT/DELETE `/plates/{id}`; GET `/plates/by-color/{id}`, `/plates/by-type/{id}` |
| Mẫu chocolate | GET/POST `/choco-templates`; GET/PUT/DELETE `/choco-templates/{id}`; GET `/choco-templates/by-plate-type/{id}`; POST `/choco-templates/upload-image` |
| Thành phần mẫu | GET/POST `/template-elements`; GET/PUT/DELETE `/template-elements/{id}`; GET `/template-elements/by-template/{id}` |
| Đơn hàng | GET/POST `/orders`; GET/PUT `/orders/{id}`; PATCH `/orders/{id}/status`; GET `/orders/by-customer/{id}` |
| Thanh toán | GET/POST `/payments`; GET `/payments/{id}`, `/payments/by-order/{id}` |
| Hoàn tiền | GET/POST `/refunds`; GET `/refunds/{id}`; PATCH `/refunds/{id}/approve`, `/refunds/{id}/reject` |
| Sự cố | GET/POST `/incident-reports`; GET/PUT `/incident-reports/{id}`; PATCH `/incident-reports/{id}/status` |
| Đối soát | GET/POST `/cash-flow-audits`; GET/PUT `/cash-flow-audits/{id}` |
| Dashboard | GET `/dashboard/overview`, `/dashboard/revenue`, `/dashboard/orders-statistics`, `/dashboard/top-plates`, `/dashboard/payment-statistics` |

Write DTO quan trọng:

| Tài nguyên | Các field |
| --- | --- |
| Admin tạo/sửa | `username`, `email`, `password`; role do server đặt |
| Customer tạo/sửa | `fullName`, `phone`, `email` |
| Staff tạo | `fullName`, `employeeCode`, `phone`, `position`, `isActive` |
| Staff sửa | Như tạo, thêm `adminId` |
| Loại dĩa | `shape`, `typeName`, `dimensions` |
| Màu dĩa | `colorName`, `colorCode`, `isActive` |
| Dĩa | `typeId`, `colorId`, `sku`, `material`, `color`, `price`, `stockQuantity` |
| Mẫu | `plateTypeId`, `staffId`, `templateName`, `imagePreviewUrl`, `gcodeFileUrl`, `isActive` |
| Thành phần mẫu | `templateId`, `staffId`, `elementName`, `positionX`, `positionY`, `scale` |
| Đơn hàng | `customerId`, `plateId`, `chocoTemplateId` |
| Thanh toán | `cashReceivedConfirmed`, `orderId`, `auditId` tùy chọn, `amount`, `paymentMethod` |
| Hoàn tiền | `auditId` tùy chọn, `paymentId`, `refundAmount`, `reason` |
| Sự cố | `staffId`, `incidentType`, `description`, `status` |
| Đối soát | `expectedRevenue`, `expectedRefund`, `auditDate` |

Response dĩa còn có `typeName`, `shape`, `dimensions`, `colorName`, `colorCode`. Dashboard overview trả `totalCustomers`, `totalOrders`, `completedOrders`, `pendingOrders`, `totalRevenue`, `totalRefunds`.

PATCH trạng thái Staff/Màu nhận `{ isActive: boolean }`; Đơn hàng/Sự cố nhận `{ status: string }`. Approve/reject hoàn tiền không cần body.

Upload mẫu dùng multipart, PNG/JPEG tối đa 5 MB. Frontend không tự sinh G-code hoặc điều khiển robot.

Các giới hạn nghiệp vụ cần giữ:

- Đơn hàng chỉ sửa nội dung khi `Pending`; chuyển `Pending → Processing/Cancelled`, `Processing → Completed/Cancelled`. Bắt đầu xử lý trừ kho, hủy đang xử lý trả kho. Không có API xóa đơn.
- Payment chỉ ghi nhận Cash thật đã nhận, bắt buộc xác nhận `cashReceivedConfirmed: true`; tiền bằng tổng đơn. Không giả lập payment online, không sửa/xóa payment.
- Refund phải gắn Payment thành công, không vượt số tiền thanh toán; approve/reject chỉ từ `Pending`. Approved chưa có nghĩa tiền đã thực sự hoàn.
- Audit chỉ gửi ngày và doanh thu/hoàn tiền kỳ vọng; tổng thực tế do Backend tính.
- Sự cố chuyển `Open → In Progress/Resolved`, `In Progress → Resolved`.
- Không xóa Admin đang đăng nhập.

## 7. CORS và kết nối Frontend

Preflight từ `http://localhost:5173` trả `204` nhưng **không có** `Access-Control-Allow-Origin`. Không coi riêng status 204 là CORS thành công. Danh sách origin trong cấu hình Backend đang rỗng.

Development Frontend dùng Vite proxy `/api` và `/uploads` đến `http://127.0.0.1:5143`, trình duyệt gọi URL tương đối cùng origin. Cách này không cần thay cấu hình Backend. Production cần reverse proxy tương đương; proxy development không nằm trong bundle `dist`.

Không sửa `.env`, appsettings hoặc bất kỳ cấu hình CORS Backend nào.

## 8. Lệnh kiểm tra đã dùng, không chứa secret

Chạy các lệnh Git sau tại checkout BE riêng:

```powershell
git status --short
git branch --show-current
git pull --ff-only origin BE
git log -1 --format='%H %ci'
git status --porcelain
git diff --quiet
```

Runtime, process và HTTP:

```powershell
& 'C:/Users/thong/.dotnet/dotnet.exe' --info
Get-NetTCPConnection -State Listen |
  Where-Object { $_.LocalPort -in 5143, 1433 }
Get-Process -Id 16628

$spec = Invoke-RestMethod http://127.0.0.1:5143/swagger/v1/swagger.json
Invoke-WebRequest http://127.0.0.1:5143/swagger/index.html -SkipHttpErrorCheck
Invoke-WebRequest http://127.0.0.1:5143/api/plates -SkipHttpErrorCheck
Invoke-WebRequest http://127.0.0.1:5143/api/auth/login `
  -Method Post -ContentType 'application/json' -Body '{}' -SkipHttpErrorCheck
Invoke-WebRequest http://127.0.0.1:5143/api/customers `
  -Method Post -ContentType 'application/json' -Body '{}' -SkipHttpErrorCheck
Invoke-WebRequest http://127.0.0.1:5143/api/auth/me `
  -Headers @{ Authorization = 'Bearer invalid-token-readonly-probe' } `
  -SkipHttpErrorCheck
Invoke-WebRequest http://127.0.0.1:5143/api/auth/login -Method Options `
  -Headers @{ Origin = 'http://localhost:5173';
              'Access-Control-Request-Method' = 'POST';
              'Access-Control-Request-Headers' = 'content-type,authorization' } `
  -SkipHttpErrorCheck
```

Đếm operations và kiểm tra toàn bộ GET không token:

```powershell
$operationCount = 0
$getResults = @()
foreach ($path in $spec.paths.PSObject.Properties) {
  foreach ($operation in $path.Value.PSObject.Properties) {
    if ($operation.Name -in 'get', 'post', 'put', 'patch', 'delete') {
      $operationCount++
    }
  }
  if ($path.Value.get) {
    $url = 'http://127.0.0.1:5143' + $path.Name.Replace('{id}', '2147483647')
    $response = Invoke-WebRequest $url -SkipHttpErrorCheck -TimeoutSec 10
    $getResults += [PSCustomObject]@{
      Path = $path.Name
      Status = [int]$response.StatusCode
    }
  }
}
$operationCount
$getResults
```

Truy vấn SQL chỉ đọc sử dụng mật khẩu đã tồn tại trong môi trường container, không in giá trị hoặc ghi vào file:

```powershell
& 'C:/Users/thong/AppData/Local/Programs/DockerDesktop/resources/bin/docker.exe' `
  ps --format '{{.ID}} {{.Image}} {{.Names}} {{.Ports}}'

& 'C:/Users/thong/AppData/Local/Programs/DockerDesktop/resources/bin/docker.exe' `
  exec chocorobot-sql sh -lc 'SQLCMDPASSWORD="$MSSQL_SA_PASSWORD" /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -C -d ChocoRobotDB -Q "SET NOCOUNT ON; SELECT DB_NAME() AS database_name; SELECT COUNT(*) AS table_count FROM sys.tables; SELECT t.name, SUM(p.rows) AS row_count FROM sys.tables t JOIN sys.partitions p ON t.object_id=p.object_id WHERE p.index_id IN (0,1) GROUP BY t.name ORDER BY t.name;" -W'
```

## 9. Giới hạn còn lại

Chưa có username/password Admin thật do người dùng cung cấp để kiểm tra login `200`, profile sau đăng nhập, quyền `403`, đọc danh sách có JWT và CRUD thật. Không tạo JWT bằng secret nội bộ, đổi hash, tạo account hoặc dùng dữ liệu giả để vượt qua bước này.

Frontend có thể hoàn thiện giao diện và contract trước; chỉ được kết luận E2E authenticated/CRUD thành công sau khi chạy với account thật và có kết quả thật. Bản ghi này không khẳng định các luồng đó đã pass.

**Xác nhận:** không sửa code, Controller, Service, Repository, Model/Entity, Middleware, cấu hình, `.env`, schema hoặc dữ liệu Backend. Không commit, push, merge, reset hoặc force push. Backend working tree sạch sau kiểm tra.
