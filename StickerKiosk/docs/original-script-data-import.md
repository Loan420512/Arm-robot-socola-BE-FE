# Import dữ liệu gốc từ script.sql

Ngày12/11/2026,Asia/Saigon. Nguồn do người dùng cung cấp: C:/Users/thong/Downloads/script.sql. SHA256: 621bebfd001c3a0684767e324700a1c7467fe501ee96a24941f7f62847a70bf9. File nguồn UTF16LE giữ nguyên.

## Phạm vi đã nhập

Đã nhập18bản ghi nghiệp vụ vào ChocoRobotDB trênDocker127.0.0.1:1433:

|Bảng|Số bản ghi|
|---|---:|
|CHOCO_TEMPLATE|1|
|PLATE|1|
|PLATE_TYPE|1|
|PLATE_COLOR|10|
|STAFF|1|
|CUSTOMER|2|
|ORDER|1|
|TEMPLATE_ELEMENT|1|

Mẫu gốc: ID1,HappyBirthday; dĩa gốc ID1,PLATE-001,sứ trắng20cm,giá50000đ,tồn100. Đơn hàng từ nguồn giữPending, không tạo thanh toán hoặc cập nhật trạng thái. Không nạp lại4mẫu cơ bản đã gỡ.

## Admin và schema

File nguồn có1Admin ID2,usernameadmin,hashmật khẩu khác tài khoản đang dùng. Không nhập đè/reset credential. GiữAdminhiện tại ID1 và map STAFF.admin_id từ2sang1. Các bản ghi nghiệp vụ khác giữ ID/giá/tồn/thời gian/nội dung nguồn.

Không thực thi CREATE/ALTERDATABASE,CREATE/ALTERTABLE,đường dẫnMDF/LDFWindows hoặc thay đổi tùy chọndatabase trong script. Chỉ các INSERT dữ liệu thuộc bảng cho phép, có values literal được kiểm tra, được trích xuất; thứ tự nhập theoFK. Dùng transactionXACT_ABORT/SERIALIZABLE,guarddatabase và đích nghiệp vụ phải trống,IDENTITY_INSERT đểgiữ ID,kiểm tra rowcount trướccommit. Không dùngTRUNCATE/DELETE hoặc sửaBackendsource/config/secrets/schema.

## Backup trước khi nhập

Backup COPY_ONLY+COMPRESSION+CHECKSUM và RESTOREVERIFYONLY đều thành công. Filelocal: output/backups/ChocoRobotDB-before-original-script-import-20261112-160600.bak (618496bytes). SHA256:0EA735B5E6DD4187F1B057A008AA054B625BFAB00ECF3098FC889B922F927EF7. Backup/log dữ liệu nhạy cảm không đưa vàoGit. GeneratedSQLnhập chỉ lưu TEMP và trongcontainer/tmp; không thêm bản chứa customercontacts/passwordhash vào source.

## Kiểm chứng

- DBCCCHECKCONSTRAINTS không báo lỗi; không cóFK bịdisable/untrusted.
- API mẫu/dĩa trả200với1record; loại dĩa1,màu10. Frontend đọc dữ liệu quaAPIthật.
- Playwright chọnHappyBirthday vàPLATE-001,hiện màuTrắng,50000đ,tồn100,kích thước20cm; sang bước thông tin thanh toán không cầnCustomerlogin. Không submit tạo contact thử.
- Mô hình máy3Dgốc vẫn hiển thị; không đổi renderer hoặc Backendsource trong lượt này.

## Dữ liệu media gốc cần bổ sung

Script đặt image_preview_url tớiURLtrangfptshop; trình duyệt không tải được nhưảnh (ORB/ERR_FAILED). gcode_file_url lại là/uploads/choco-templates/98177da69a0c4529b7b7613560f73d84.png; tệp này không có trênmáy, cảBE/FEtrả404và tênfile làPNGchứ không phảiG-code. MẫuHappyBirthday chưa mô phỏng được vì thiếuđường chạy hợp lệ. Giữ nguyênURLnguồn,không tự thayảnh/G-code hoặc dùngpresetgiả. Cần đúngảnh vàfileG-codegốc để bổ sung.

Không commit/push. BE5143,FE5173vàSQL1433giữ chạy.

## Cập nhật theo yêu cầu bỏ G-code

Luồng mô phỏng không còn phụ thuộcGcode/ảnhURLcũ. Website đọc thành phầnHappyBirthdayvàtọađộtỉlệtừdatabaseđểdựngbố cụcchữ; xem [báo cáo mới](database-template-layout.md). Các lỗiURLnguồn nêu trên vẫnđượcgiữ trongrecord nhưngkhôngcònchặnbảnxemhoặcgâyrequestlỗiStudio.
