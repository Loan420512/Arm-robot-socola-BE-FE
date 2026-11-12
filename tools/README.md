# Sinh BCrypt hash cho kiểm thử local

Chạy từ thư mục solution bằng .NET SDK 10 đang có trên máy:

```powershell
dotnet run --file tools/GenerateBcryptHash.cs
```

Nhập mật khẩu khi được hỏi; ký tự không được hiển thị. Công cụ dùng đúng BCrypt.Net-Next 4.2.0 như Backend, WorkFactor 12, salt ngẫu nhiên và tự Verify trước khi in hash. Mỗi lần chạy sẽ tạo hash khác nhau cho cùng một mật khẩu; đây là hành vi BCrypt bình thường.

Đây là file C# chạy độc lập, không thêm project vào solution, không có endpoint mới, không đọc/ghi database, không lưu mật khẩu vào source hoặc file. Công cụ cho phép mật khẩu kiểm thử do người dùng nhập; nó không thay đổi quy tắc mật khẩu của API tạo Admin, đổi mật khẩu hoặc bootstrap.

## Cập nhật thủ công trong SQL Server

Chỉ sau khi kiểm tra đúng instance/database và đúng tài khoản, dán hash vừa sinh vào biến bên dưới rồi tự chạy trong SSMS. Script chỉ là hướng dẫn, không được công cụ hoặc Backend tự thực thi. Username phải đúng bản ghi cần cập nhật; role hợp lệ là Admin.

```sql
USE [ChocoRobotDB];
SET XACT_ABORT ON;
BEGIN TRANSACTION;

DECLARE @Username varchar(100) = '<username cần cập nhật>';
DECLARE @PasswordHash varchar(255) = '<BCrypt hash vừa sinh>';

IF (SELECT COUNT(*) FROM dbo.ADMIN WHERE username = @Username AND role = 'Admin') <> 1
    THROW 50001, 'Expected exactly one matching Admin account.', 1;

UPDATE dbo.ADMIN
SET password_hash = @PasswordHash
WHERE username = @Username AND role = 'Admin';

COMMIT;
```

Không lưu mật khẩu plaintext vào `password_hash`. Hash BCrypt thường dài 60 ký tự và có prefix biểu thị phiên bản/cost, ví dụ `$2a$12$`. Cột `varchar(255)` hiện tại đủ chứa hash mà không cần đổi schema.

Sau khi tự cập nhật, gọi `POST /api/auth/login` bằng username/mật khẩu đã chọn. Nếu đúng hash và role Admin, API mới cấp JWT. Trước khi cập nhật SQL, lỗi 401 vẫn là kết quả đúng; công cụ này không bỏ qua xác thực hoặc tự sửa dữ liệu.
