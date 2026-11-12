# Máy 3D từ dự án Threejs người dùng cung cấp

Ngày kiểm tra: 12/11/2026, Asia/Saigon.

## Nguồn máy đang được sử dụng

Máy trong ứng dụng Threejs gốc được tạo bởi `createDispenserToolhead()` tại `C:/Users/thong/Downloads/Threejs/src/main.js`, dòng 355–533, và được gọi tại dòng 535. Cụm này có đầu kim kim loại, ống chứa trong suốt, vòng kẹp, cột chocolate, piston, thanh đỡ, mô-tơ, vòng LED và ống dẫn.

Mặc dù thư mục gốc có file `kuma_heavy_robot_r-9000s.glb`, `src/main.js` không import `GLTFLoader` và không nạp file robot này. Vì vậy, máy mà ứng dụng nguồn thực sự hiển thị là cụm `RoboticDispenserToolhead`, không phải robot KUMA đã ghép thêm trong lần tích hợp trước.

Máy gốc hiện được đặt trong `src/choco/studio/sourceMachine.ts`. Bản sao nguyên văn của hàm gốc được lưu tại `src/choco/studio/vendor/threejs/createDispenserToolhead.original.txt`; nguồn và thay đổi adapter được mô tả trong README cùng thư mục. Không chỉnh sửa thư mục Downloads.

## Bằng chứng giữ nguyên hình học

- SHA-256 của `main.js` gốc: `6b4ed2ca095cc9b95ef512204791a9696bbda412801b2f72f17674e63c5fa15a`.
- SHA-256 của hàm máy gốc: `d04fc219d0cf7e680aded7d95fa550283c6fa1ecba253e3bff6606626cdd8b5d`.
- Snapshot hàm có 179 dòng, đúng nội dung nguồn.
- Review độc lập thực thi trực tiếp hàm gốc trong môi trường Three.js, rồi so sánh với factory mới bằng cùng màu đầu vào: **20 mesh, 18 phần tử con trực tiếp**, cùng tên/placement nhóm, cùng hierarchy.
- SHA-256 của từng geometry position/index buffer, transform cục bộ, cast-shadow và các thuộc tính vật liệu/màu đều trùng giữa bản chạy từ nguồn và factory adapter. Không thêm geometry máy, cánh tay hoặc khớp nối mới.

Các thay đổi adapter chỉ gồm đưa biến toàn cục vào phạm vi hàm, nhận màu chất lỏng từ đầu vào thay `state.sauceColor`, trả về group để scene hiện tại sở hữu thay `scene.add` toàn cục, và cung cấp điều khiển màu/piston/LED. Các kích thước, vật liệu và vị trí các chi tiết máy gốc được giữ nguyên.

## Chuyển động và tích hợp với dữ liệu hiện có

`sourceMotion.ts` chuyển timeline nguồn `startRoboticPlating()` thành hàm có thể tua theo tiến độ để dùng với các nút chạy/tạm dừng hiện tại. Giữ các chiều cao nguồn: nghỉ Y3, hover Y1,5 và nâng chuyển nét Y0,35; giữ các giai đoạn hạ 0,6 giây rồi 0,5 giây, nâng/di chuyển/hạ giữa hai nét 0,25/0,45/0,25 giây, vẽ theo độ dài với thời gian tối thiểu 0,6 giây, và thu lên 0,8 giây. Easing, màu LED và giới hạn piston 0,7 đơn vị đi theo nguồn.

Tọa độ tiếp xúc Y được điều chỉnh theo bề mặt dĩa đang có để đầu kim gốc không đi xuyên mô hình. Đây là chuyển động mô phỏng trong trình duyệt, không xuất lệnh cho phần cứng. Đường chocolate vẫn đến từ G-code URL của bản ghi mẫu trong API hoặc nét tự vẽ do người dùng nhập; không nhập các preset viết sẵn từ ứng dụng mẫu vào thư viện API.

`scene.ts` sử dụng `createSourceMachine` và `buildSourceMotion`; đã bỏ đầu phun giản lược tự dựng, robot KUMA, thuật toán CCD và khớp nối được tạo thêm. Không còn request tải KUMA trong scene hiện hành. Asset KUMA đã sao chép từ trước không được xóa để tránh mất tài liệu người dùng, nhưng không còn được scene sử dụng.

Mô hình dĩa `dish.glb` vẫn là asset người dùng cung cấp, được giữ riêng với attribution của nó. Yêu cầu lần này là thay máy 3D bằng đúng máy nguồn, không phải thay toàn bộ giao diện hoặc bàn/dĩa bằng toàn bộ ứng dụng Threejs gốc. Camera, ánh sáng, viewport, resize, kiểm soát tiến độ và dọn tài nguyên do ứng dụng hiện tại quản lý.

## Kiểm tra

Review độc lập chạy `sourceMachine.test.ts` và `sourceMotion.test.ts`: **11/11 tests đạt**. Scoped lint cho factory, motion, scene và PlateScene đạt. Review hình học và chuyển động không phát hiện máy dựng lại hoặc chi tiết bổ sung so với hàm nguồn.

Kiểm tra trình duyệt và ảnh chụp cuối do lượt QA tổng hợp xác minh riêng. Không có thay đổi API, cấu hình, database hoặc schema cần thiết cho việc thay máy này; các thay đổi Backend từ ngoại lệ mở bốn GET công khai trước đó được giữ nguyên.

## QA tổng hợp hoàn tất

- Studio thực tế không request KUMA; chỉ tải dish.glb, catalog API và G-code mẫu. Không có lỗi console hoặc pageerror trong luồng chạy/pause/continue/hiện-ẩn máy/đổi góc.
- Camera dùng bounding box ổn định cho toàn máy ở chiều cao nghỉY3 và vùngXYcủa đường chạy, nên đặt lại góc hoặc bật máy giữa lúc đang vẽ vẫn dành chỗ cho bước thu về. Đã kiểm tra mobile390px, không tràn ngang.
- Build và lint đạt; tổng130/130tests đạt trong7files, gồm11tests so máy gốc và chuyển động nguồn. Vẫn có warning bundleThree.js lớn đã lazyload theo route.
- Ảnh: output/playwright/source-machine-idle.png, source-machine-spraying.png, source-machine-mobile-spraying.png, source-machine-mobile-restored.png.
- SHA-256 main.js ở thư mục Downloads sau tích hợp vẫn6b4ed2ca095cc9b95ef512204791a9696bbda412801b2f72f17674e63c5fa15a. Không commit/push.
