# Gỡ dữ liệu mẫu đã nạp thêm

Ngày12/11/2026,Asia/Saigon. Theo yêu cầu xóa các fill mới và trở về dữ liệu gốc, đã thực hiện:

- Tạo bản sao lưu đầy đủ COPY_ONLY+COMPRESSION+CHECKSUM của ChocoRobotDB và RESTORE VERIFYONLY thành công trước khi xóa. Bản sao lưu không bị đưa vào Git.
- Backup: output/backups/ChocoRobotDB-before-basic-template-removal-20261112-155952.bak,614400bytes,SHA256 7A902A722129E3FFBB0FF56E3E8C7ABF93EE926FC13C345782C445441AC72946. Bản này giữ trạng thái trước khi gỡ4mẫu, không phải bản gốc có1mẫu/1dĩa mà người dùng nhắc tới.
- Xóa đúng CHOCO_TEMPLATE ID1,2,3,4 có tên và URL khớp seed; kiểm tra không có ORDER/TEMPLATE_ELEMENT phụ thuộc.
- Xóa PLATE_TYPE ID2 tên Dĩa tròn200mm(thamchiếumẫu) và STAFF ID1 mã CATALOG-BASIC khi không còn bản ghi tham chiếu.
- Transaction có XACT_ABORT/SERIALIZABLE, so khớp ID+tên+URL trước khi xóa; không reseedidentity, không đổi schema/config/auth/Admin.
- Script: scripts/remove-added-basic-template-catalog.sql. Đây là script thủ công đã chạy, không nằm trong startup.

Sau khi gỡ: ADMIN1;12bảng nghiệp vụ0. API mẫu,dĩa,loại,màu trả200với0bản ghi. AssetsPNG/SVG/G-code và script seed được giữ như tài liệu/fixture có thể phục hồi, không được runtime dùng thay dữ liệu API và không tự nạp lại.

## Bản gốc chưa được định vị

Người dùng cho biết trước khi nạp thêm, DBgốc có1mẫu vẽ và1dĩa. Bản Docker được kết nối từ đầu không có hai bản ghi đó. Appsettings củaBE trỏ localhost\MSSQLSERVER01 với WindowsAuth, còn UserSecrets ghi đè sang Docker127.0.0.1:1433; máy hiện không có SQLServernamedinstance hoặc SQLBrowser được cài/chạy. Docker chỉ có1containerSQL và1databaseứngdụng ChocoRobotDB. Không tìm thấy tệpSQL/BAK/BACPAC/MDFbản gốc trong dựán/Downloads, không có restorehistory/backuphistorybản gốc trongmsdb.

Chưa khôi phục hoặc đổi kết nối sang nguồn chưa được xác minh. Cần tênmáychủSQL hoặc đườngdẫnbản saoDBgốc từ người dùng; không tự dựng1mẫu/1dĩa thay thế.

Không sửa thêm Backendsource hoặc connectionsecrets trong lượt này. Các5file thay đổi publicGETđã được cho phép trước đó giữ nguyên. Chưa commit/push.

## Đã tìm thấy dữ liệu nguồn

Người dùng đã cung cấp Downloads/script.sql. Dữ liệu được nhập sau backup, hiệnAPIcó1mẫuHappyBirthdayvà1dĩaPLATE-001. Chi tiếtAdminmapping/mediafilethiếu và phạm vi data-only trong [báo cáo import](original-script-data-import.md).
