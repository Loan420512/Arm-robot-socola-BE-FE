# Kiểm tra đăng nhập Admin local

## Nguyên nhân đã xác định

Đã kiểm tra chỉ đọc SQL Server `localhost\MSSQLSERVER01`, database `ChocoRobotDB`. Có đúng một bản ghi username `admin`, ID 2, role `Admin` (5 bytes). Tuy nhiên `password_hash` dài 31 ký tự, có prefix `BCrypt_`, không phải hash BCrypt hợp lệ.

AuthService tra cứu ADMIN qua EF Core, yêu cầu role Admin rồi gọi `BCrypt.Net.BCrypt.Verify`. Hash không hợp lệ bị thư viện từ chối và AuthService trả 401. Không có bằng chứng lỗi trong cơ chế BCrypt/JWT; dữ liệu hash hiện tại là nguyên nhân.

## Cấu trúc ADMIN thực tế

| Cột | SQL type | Nullable | Ghi chú |
|---|---|---|---|
| id | int | Không | Identity, PRIMARY KEY PK_ADMIN |
| username | varchar(100) | Có | Tên đăng nhập |
| password_hash | varchar(255) | Có | Đủ chứa BCrypt hash dài 60 ký tự |
| email | varchar(100) | Có | Email |
| role | varchar(30) | Có | CK_ADMIN_ROLE: role = Admin |

Không thay đổi schema hoặc dữ liệu.

## Công cụ đã tạo

`tools/GenerateBcryptHash.cs` là công cụ C# file-based chạy local bằng SDK .NET 10, không thêm project vào solution. Nó dùng BCrypt.Net-Next 4.2.0 giống backend, WorkFactor 12 và salt ngẫu nhiên. Mật khẩu được đọc từ bàn phím ẩn hoặc stdin, không có mật khẩu mặc định trong source, không kết nối SQL và không tự cập nhật tài khoản.

Chạy `dotnet run --file tools/GenerateBcryptHash.cs`, nhập mật khẩu kiểm thử và sao chép hash được in. Hướng dẫn SQL cập nhật thủ công nằm trong `tools/README.md`. Không thay đổi chính sách mật khẩu tối thiểu của API tạo/đổi mật khẩu/seed Admin.

## Kết quả thực tế

- Công cụ đã chạy thành công và in một BCrypt hash 60 ký tự, prefix `$2a$12$`.
- Đã Verify hash mới bằng đúng `BCrypt-Net-Next.dll` trong output net8.0 của Backend: mật khẩu người dùng yêu cầu khớp; mật khẩu ngẫu nhiên khác không khớp.
- Hash đang lưu trong ADMIN không Verify được với mật khẩu kiểm thử được cung cấp.
- POST `http://127.0.0.1:5143/api/auth/login` với tài khoản kiểm thử trả 401, `Invalid username or password`, không trả token. Đây là kết quả đúng khi hash cũ chưa được cập nhật.
- Không thực hiện INSERT, UPDATE, DELETE hoặc thay đổi dữ liệu SQL. Không thay đổi AuthService, JWT Authentication, Controller, DTO hoặc API khác.
- Chưa thể báo cáo đăng nhập 200 thành công trước khi người dùng tự cập nhật hash vào bản ghi admin. Sau khi cập nhật, cần gọi lại login để kiểm chứng kết quả cuối cùng.
