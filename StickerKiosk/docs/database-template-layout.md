# Bố cục mẫu từ database, không yêu cầu G-code

Ngày kiểm tra: 12/11/2026, múi giờ Asia/Saigon.

Website hiện dùng CHOCO_TEMPLATE, TEMPLATE_ELEMENT, PLATE và PLATE_COLOR trong database người dùng cung cấp. Mẫu Happy Birthday gồm một thành phần cùng tên, X=100, Y=75, scale=1. Dĩa PLATE-001 có màu trắng, giá 50.000đ và tồn kho100. Không đổi các bản ghi này trong lượt triển khai.

## Thay đổi Frontend

Đã gỡ parser/loader G-code và các tests của tính năng đó. Studio không đọc hoặc tải gcodeFileUrl; không còn nút mở G-code hoặc yêu cầu tệp này để bật mô phỏng. Thumbnail trên homepage/thư viện, studio3D và checkout dùng cùng dữ liệu thành phần mẫu. Không còn request đến đường ảnh fptshop hoặc tệp PNG404 trong dữ liệu cũ.

Script.sql không chứa đường vector, font hoặc quy ước đơn vị tọa độ. Bản xem hiện diễn giải elementName thành nội dung chữ: khung200×200, positionX/positionY là tâm chữ, scale nhân kích thước chữ14đơn vị. Font Be Vietnam Pro được lấy từ package Fontsource đã có trong dự án; opentype.js phân tích đường outline của font, không chọn mẫu hình theo tên. Đây là quy ước xem bố cục, không phải đường chạy máy đã hiệu chuẩn hoặc tái tạo ảnh ngoài website.

Dữ liệu thiếu/sai, ký tự không hỗ trợ, bố cục ngoài vùng dĩa và dữ liệu quá phức tạp đều báo lỗi rõ ràng. Giới hạn32thành phần,150ký tự mỗi thành phần,500nét và20.000điểm. Tự vẽ vẫn là đầu vào người dùng, tách khỏi mẫu đã lưu.

Trường gcode_file_url cũ vẫn nằm trong schema/DTO để giữ hợp đồng hiện hành; các bản ghi không bị sửa hoặc xóa cột. Form quản trị chỉ giữ trường tương thích này dưới nhãn Tệp đính kèm. Nó không tham gia dựng mẫu hoặc mô phỏng. Các tệp hình học của bốn mẫu đã gỡ còn được giữ làm tài liệu lịch sử, không dùng như catalog fallback.

## API được cho phép

Người dùng đã cho phép mở GET /api/template-elements/by-template/{id} cho khách. Chỉ action đọc này có AllowAnonymous; GET collection/detail và mọi POST/PUT/DELETE của template-elements vẫn yêu cầu Admin. Bốn GET catalog đã mở trước đó giữ nguyên. Không đổi DTO, service, repository, cấu hình, secrets, schema hoặc dữ liệu.

## Kiểm chứng

- Build BE và Tests đạt,0lỗi/0cảnh báo. Harness độc lập553checks đạt với SQL cố ý không khả dụng, không ghi dữ liệu Docker.
- GET bố cục mẫu thật trả200. GET collection/detail và POST/PUT/DELETE chưa đăng nhập trả401.
- Build, TypeScript và lint FE đạt;98tests đạt. Đã gỡ44tests G-code cùng tính năng cũ, bổ sung tests API thành phần và dựng outline theo vị trí/tỉ lệ/font thật, gồm chữ tiếng Việt.
- Playwright dựng Happy Birthday trên dĩa, chạy/tạm dừng/tiếp tục/tua, chọn PLATE-001 và sang checkout không cần Customer đăng nhập. Không submit thông tin liên hệ thử.
- Network không còn request G-code, PNG đính kèm bị thiếu hoặc fptshop. Không có lỗi JavaScript/console. Mobile390px không tràn ngang.
- Hallmark render ở1280/1440/1920/375:0FAIL,0WARN; waiver cho kích thước thẻ ảnh mẫu. Bundle Three.js vẫn có cảnh báo dung lượng; thư viện font được tải theo nhu cầu.
- Database sau triển khai vẫn1mẫu,1dĩa và1thành phần như nguồn.

Ảnh kiểm chứng: output/playwright/database-layout-happy-birthday.png, database-layout-machine-writing.png và database-layout-mobile.png.

Các module mới: templateLayout.ts, templateLayout.test.ts, TemplateArtwork.tsx. Máy Threejs gốc và thư mục Downloads giữ nguyên. Không commit hoặc push.
