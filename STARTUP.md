# Khởi động ChocoRobot với cấu hình bảo mật

Lỗi `The Secret field is required` xuất phát từ `JwtOptions.Secret`. Section đúng là `Jwt`, key đầy đủ là `Jwt:Secret`; biến môi trường tương ứng là `Jwt__Secret`. Binding ban đầu đã đúng tên nhưng giá trị chưa tồn tại trong cấu hình. `appsettings*.json` cố ý không lưu secret. Không dùng `JWT_SECRET`, `Jwt:Key` hoặc `Jwt__Key` để thay thế: chúng không bind vào thuộc tính này.

## Development: tạo khóa ngoài Git

Từ thư mục solution, chạy PowerShell:

```powershell
.\scripts\Initialize-DevelopmentSecrets.ps1
```

Script sinh 48 byte ngẫu nhiên bằng bộ sinh mật mã và lưu Base64 qua stdin vào .NET User Secrets của project. Không đưa giá trị secret vào command line, log hoặc source code; không thay khóa đã tồn tại. Project đã có `UserSecretsId`, không cần `dotnet user-secrets init` lại. Trên Windows, store nằm dưới `%APPDATA%\Microsoft\UserSecrets\<UserSecretsId>\secrets.json`, ngoài repo.

User Secrets được `WebApplication.CreateBuilder` tải tự động **chỉ trong Development**. Profile `https` hiện đặt môi trường này. Nếu chạy không dùng profile, đặt môi trường rõ ràng:

```powershell
$env:ASPNETCORE_ENVIRONMENT = 'Development'
```

Environment Variables có ưu tiên cao hơn User Secrets. Nếu `Jwt__Secret` tồn tại nhưng rỗng, xóa biến đó để dùng User Secrets:

```powershell
Remove-Item Env:Jwt__Secret -ErrorAction SilentlyContinue
```

## Cấu hình còn bắt buộc: kết nối database

Backend cũng cần `ConnectionStrings:DefaultConnection`. Cấp connection string thực tế qua môi trường hoặc User Secrets, không commit vào appsettings:

```powershell
$secureConnection = Read-Host 'Connection string SQL Server thực tế, Database=ChocoRobotDB' -AsSecureString
$env:ConnectionStrings__DefaultConnection = [Net.NetworkCredential]::new('', $secureConnection).Password
```

Hoặc lưu trong User Secrets (stdin, không in giá trị):

```powershell
@{ 'ConnectionStrings:DefaultConnection' = $env:ConnectionStrings__DefaultConnection } |
    ConvertTo-Json -Compress |
    dotnet user-secrets set --project .\BE-SWD\BE-SWD.csproj
```

Tên database phải là `ChocoRobotDB`; database và schema phải được cung cấp sẵn. Ứng dụng không tạo hoặc thay đổi database. Server local được kiểm tra ở phiên trước chưa hiển thị database này, vì vậy chưa xác minh được đăng nhập bằng tài khoản thật hoặc CRUD SQL.

## Build và chạy

```powershell
dotnet build .\BE-SWD.slnx
dotnet run --project .\BE-SWD --launch-profile https
```

Swagger profile local: https://localhost:7143/swagger. HTTPS cần chứng chỉ Development hợp lệ; nếu thiếu, cấu hình bằng `dotnet dev-certs https --trust`.

Để thử HTTP với địa chỉ do bạn chọn, không phụ thuộc chứng chỉ:

```powershell
$env:ASPNETCORE_ENVIRONMENT = 'Development'
$env:ASPNETCORE_URLS = Read-Host 'Địa chỉ HTTP local muốn chạy'
dotnet run --project .\BE-SWD --no-launch-profile
```

Swagger ở `/swagger` trên địa chỉ đã cấu hình. Chỉ khi database/account Admin sẵn sàng mới đăng nhập tại `/api/auth/login`; sau đó dán `data.accessToken` vào **Authorize** (token thuần). Không có tài khoản hoặc mật khẩu mặc định.

Bộ kiểm tra có thể xác minh việc khởi động bằng chính User Secrets đã lưu, không truyền JWT secret qua biến môi trường:

```powershell
dotnet run --project .\BE-SWD.Tests -- --development-user-secrets
```

Chế độ này kiểm tra JWT/Swagger trên HTTP loopback với kết nối SQL tạm thời cố ý không khả dụng. Nó không ghi cấu hình kết nối vào User Secrets và không thay đổi database. Kiểm tra không thay thế đăng nhập/CRUD với dữ liệu thật.

## Các môi trường khác

Cấp `Jwt__Secret` bằng secret manager hoặc môi trường triển khai; User Secrets không tự tải trong Production. Có thể tạo một khóa ngẫu nhiên cho process Development bằng:

```powershell
$env:Jwt__Secret = [Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(48))
```

Không in hoặc commit khóa; dùng khóa ổn định trong secret store khi triển khai để token không bị vô hiệu mỗi lần restart. `[Required]`, kiểm tra tối thiểu 32 byte, validation issuer/audience và các ràng buộc options vẫn được giữ.

## Kết quả kiểm tra phiên sửa lỗi

- Đã xác nhận section `Jwt` khớp với `JwtOptions`; nguyên nhân là chưa cấp `Jwt:Secret`, không phải sai tên section. Trước khi cấu hình, không có User Secrets store và không có biến môi trường tương ứng ở scope Process/User/Machine.
- Đã tạo và lưu khóa JWT Development ngẫu nhiên trong User Secrets ngoài workspace. Không ghi giá trị vào source hoặc log.
- Build solution thành công, 0 lỗi. Còn 1 cảnh báo NU1900 vì không truy cập được nguồn kiểm tra vulnerability NuGet.
- Chạy bằng User Secrets thực tế: 128 checks passed, gồm khởi động HTTP, Swagger JWT Authorize, xác thực token đúng/sai role/hết hạn, validation và từ chối secret thiếu/ngắn. Kết quả ở `STARTUP-TEST-RESULTS.txt`. Các process kiểm tra tự dừng sau khi hoàn tất.
- Chạy profile `https` bình thường đã vượt qua validation JWT và dừng đúng tại `ConnectionStrings__DefaultConnection` chưa được cấp. Cần cấu hình connection string thực tế như hướng dẫn trên; không tự lưu một connection string suy đoán.
- `dotnet dev-certs https --check` chưa tìm thấy chứng chỉ hợp lệ. Cần chứng chỉ cho profile HTTPS hoặc dùng cấu hình HTTP để kiểm tra Development.
- Không sửa API nghiệp vụ, không thay đổi database; chưa kiểm chứng login/CRUD với dữ liệu thật.
