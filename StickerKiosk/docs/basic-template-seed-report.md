# Mẫu cơ bản và mô phỏng từ dữ liệu API

> Cập nhật: người dùng đã yêu cầu gỡ các mẫu vừa nạp;4record và2reference đã được xóa sau backup. Báo cáo bên dưới là lịch sử nạp. Xem [trạng thái hiện tại](basic-template-cleanup-report.md).

Ngày 12/11/2026, Asia/Saigon.

## Dữ liệu đã nạp

Theo yêu cầu “fill data vài mẫu vẽ cơ bản”, đã thêm vào `ChocoRobotDB` trên Docker `127.0.0.1:1433`:

| ID mẫu | Tên | URL ảnh | URL đường mẫu | Số nét/điểm |
| --- | --- | --- | --- | --- |
| 1 | Trái tim cơ bản | `/catalog/basic/heart.png` | `/catalog/basic/heart-preview.gcode` | 1 / 201 |
| 2 | Bông hoa năm cánh | `/catalog/basic/flower.png` | `/catalog/basic/flower-preview.gcode` | 2 / 306 |
| 3 | Xoắn ốc chocolate | `/catalog/basic/spiral.png` | `/catalog/basic/spiral-preview.gcode` | 1 / 301 |
| 4 | Ba đường sóng | `/catalog/basic/waves.png` | `/catalog/basic/waves-preview.gcode` | 3 / 423 |

Các mẫu đều hoạt động, tham chiếu loại dĩa ID2 “Dĩa tròn 200 mm (tham chiếu mẫu)” và tác giả tham chiếu ID1, mã `CATALOG-BASIC`. Tác giả này là bản ghi minh họa, không phải nhân viên thật hoặc tài khoản đăng nhập.

Chưa có credential Admin để gọi API ghi, vì vậy dữ liệu được nạp bằng SQL transaction có kiểm tra database, `XACT_ABORT` và chống trùng theo URL ảnh. Script lưu trong `scripts/seed-basic-template-catalog.sql`; không tự chạy cùng Backend hoặc Frontend. Script chỉ INSERT các bản ghi thiếu, không đổi schema hay cập nhật bản ghi đang có. Không tạo/reset Admin, không đổi mật khẩu/JWT/quyền.

Không thêm dĩa bán hàng, giá, tồn kho, màu hàng hóa, khách hàng, đơn hoặc thanh toán. Trạng thái sau nạp: CHOCO_TEMPLATE4, PLATE_TYPE1, STAFF1, PLATE0, PLATE_COLOR0; ADMIN vẫn1.

## Ảnh và tệp đường mẫu

Ảnh PNG600x600 nền trong suốt, SVG và G-code được tạo từ cùng đường hình học. Assets nằm trong `public/catalog/basic/`; script tái tạo `scripts/generate-basic-template-assets.mjs`, manifest tài liệu `docs/basic-templates-manifest.json`.

Manifest không được import vào runtime để thay catalog. Website tải record từ `/api/choco-templates`, sau đó tải đúng URL ảnh/G-code record trả về. Thay dữ liệu API hoặc tệp tương ứng sẽ thay bản xem; không đoán hình bằng tên mẫu.

G-code là tham chiếu xem thử cho dĩa200mm, tọa độ tuyệt đối theo mm, G0 nâng/di chuyển, G1 ở Z1 là nét vẽ. Không có van, heater hoặc extrusion; không phải chương trình đã hiệu chuẩn để chạy phần cứng. Nhãn này được ghi trong từng tệp.

## Sửa lỗi mẫu không mô phỏng

Trước đây Studio chỉ hiển thị ảnh template từ API; renderer chỉ nhận nét tự vẽ. Nay `gcode.ts` tải `gcodeFileUrl`, kiểm tra định dạng rồi chuyển thành các stroke3D. Khi stroke sẵn sàng, ảnh hoàn chỉnh được ẩn để không che phần nét đang chạy.

Parser hỗ trợ G21/G90/G0/G1 cho định dạng tham chiếu này, đảo trục Y khớp ảnh, chuẩn hóa quanh100/100mm, giữ ngắt nét khi nâng Z. Các lệnh chưa hỗ trợ, tọa độ vượt vùng, file quá lớn, HTML hoặc nội dung sai đều báo lỗi, không dùng hình mẫu fallback. Loader có timeout30giây, AbortController, giới hạn1MB/100nét/20.000điểm; không gửi Bearer tới URL tệp.

Nút **Xem mô phỏng** chạy khi mẫu tải hợp lệ; có tạm dừng, tiếp tục, tua tiến độ, đổi góc/kích thước và đổi mẫu. Không cần chọn sản phẩm dĩa hoặc đăng nhập để mô phỏng. Checkout vẫn yêu cầu dữ liệu sản phẩm thật và còn khóa vì bảng PLATE chưa có sản phẩm.

## Xác minh

- API thật trả200, tổng4mẫu và1loại dĩa; `/plates`/`plate-colors` trả danh sách rỗng đúngDB.
- Toàn bộ PNG/G-code trả200 từ FE; ảnh giải mã đúng600x600 RGBA.
- Playwright chọn cả4mẫu từ thư viện API, chạy/tạm dừng và tua đến100%, không có lỗi JS hoặc scene. Kiểm tra riêng trái tim pause/continue đến kết thúc, mobile390px không tràn ngang.
- Screenshot: `output/playwright/heart-api-simulating.png`, `heart-api-simulating-mobile.png`, `flower-api-3d-complete.png`, `catalog-basic-templates-desktop.png`.
- Tổng119testsPASS, trong đó44tests parser/loader mới; TypeScript và lint đạt. Build đạt, vẫn có warning kích thước bundle Three.js đã nạp theo route.
- Hallmark render ở1280/1440/1920/375:0FAIL,0WARN; waiver cho ô ảnh chọn mẫu lớn.
- Review độc lập không phát hiện lỗi trong path loading, đổi mẫu, pause, transform hoặc parser của4tệp thật.

Không sửa thêm source/config Backend trong lượt nạp mẫu/mô phỏng. Các5fileBE thay đổi từ lượt mở publicGET đã được cho phép trước đó vẫn giữ nguyên. Không commit/push.
