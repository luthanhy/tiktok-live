# 💍 ĐÁM CƯỚI LIVE – NGÀY CHUNG ĐÔI

Trò chơi đám cưới tương tác **thuần Việt** cho TikTok LIVE. Người xem cùng tổ chức đám cưới cho cô dâu chú rể bằng thả tim, bình luận, theo dõi, chia sẻ và tặng quà. Mọi thứ đều Việt Nam: áo dài, khăn đóng, khăn vấn, cổng Song Hỷ, đèn lồng, mâm quả, nghi lễ Rước dâu, Lễ gia tiên, nhạc ngũ cung, và MC đọc bằng **giọng người Việt**.

Khung hình mặc định là **dọc 9:16 (1080×1920)**, đúng tỉ lệ điện thoại khi xem TikTok LIVE.

## 🚀 Lên live trong 4 bước

1. **Bật máy chủ game** (để cửa sổ này mở suốt buổi live):
   ```bash
   npm install
   npm run start:node
   ```
2. **Mở cửa sổ sân khấu dọc** bằng Microsoft Edge (có sẵn giọng Việt Hoài My và tự phát nhạc):
   ```bash
   npm run live
   ```
3. **TikTok LIVE Studio** → chọn **Mobile view (dọc)** → **Add source** → **Window capture** → chọn cửa sổ **"Đám Cưới Live – Ngày Chung Đôi"** → kéo khung cho kín màn hình → **Go LIVE**.
4. Mở `http://localhost:3000/admin`, nhập **@tên_tiktok** → bấm **Kết nối** → bấm **Làm lại từ đầu**.

> Muốn nét tuyệt đối 1080×1920: dùng OBS Studio (Browser source 1080×1920 + Virtual Camera), hoặc xoay màn hình Windows sang dọc trong lúc live.

## 🎙️ Giọng đọc tiếng Việt

MC đọc to bằng tiếng Việt, mỗi lần một kiểu câu để không bị lặp:
- **Quà tặng**: "Cảm ơn Thảo Vy đã tặng 5 Hoa Hồng cho cô dâu chú rể!". Quà lớn luôn được cảm ơn ngay.
- **Theo dõi, chia sẻ, khách mới vào**: chào mừng và cảm ơn (khách vào phòng được chào tối đa mỗi 20 giây một lần).
- **Bình luận**: "Tuấn chúc: trăm năm hạnh phúc", "Hà nói: hôn đi".
- **Lời dẫn từng chương**.

Các câu cách nhau khoảng 2,5 giây, nên phòng đông vẫn nghe tự nhiên. Game **chỉ đọc bằng giọng Việt**: nếu máy không có giọng Việt thì im lặng, không đọc bằng giọng Tây. Giọng tốt nhất là **Hoài My** (nữ) hoặc **Nam Minh** (nam), có sẵn trên **Microsoft Edge**. Đổi giọng, chế độ đọc bình luận (tất cả / chỉ lời chúc / tắt) trong trang quản lý. Thanh trạng thái **"Giọng đọc"** cho biết sân khấu đang dùng giọng nào.

## 🎵 Nhạc nền

Mặc định phát lặp bài **Nhạc Đám Cưới Việt Nam – Giao Hưởng Tân Thời** (link mp3 trong `src/config/wedding.config.json` → `audio.musicUrl`). Nhạc tự nhỏ lại khi MC nói. Đổi link trong trang quản lý. Để trống thì dùng bộ nhạc **ngũ cung tự soạn** (Dạo đầu, Rước dâu, Lễ gia tiên, Tình ca trao nhẫn, Nên duyên, Tiệc cưới, Trăm năm hạnh phúc).

## 📖 7 chương nghi lễ

| # | Chương | Mục tiêu |
|---|---|---|
| 1 | **Chuẩn Bị Đám Cưới** — nhà trai sửa soạn mâm quả | Thả tim, theo dõi, tặng hoa để trang trí rạp cưới |
| 2 | **Rước Dâu** — nhà trai rước cô dâu | Cổ vũ cô dâu |
| 3 | **Lễ Gia Tiên** — thắp hương báo cáo tổ tiên | Gửi lời chúc chứng giám |
| 4 | **Trao Nhẫn Cưới** | Tặng quà lấp đầy thanh Nhẫn cưới |
| 5 | **Nên Duyên Vợ Chồng** — nụ hôn hạnh phúc | Mở tiệc thật linh đình |
| 6 | **Tiệc Cưới** — cắt bánh, rót rượu, văn nghệ | Bánh cưới · Rượu mừng · Văn nghệ |
| 7 | **Trăm Năm Hạnh Phúc** — chào bàn, cảm ơn quan khách | Pháo hoa mừng |

## 💬 Người xem tương tác

- **Thả tim**: cộng điểm yêu thương, tăng niềm vui.
- **Theo dõi**: một vị khách mới bước vào rạp cưới.
- **Chia sẻ**: bắn pháo giấy.
- **Bình luận**: hiện bong bóng thoại trên đầu khách và được đọc to. Gõ `hôn đi`, `dzô`, `nhảy`, `chụp ảnh` để cô dâu chú rể phản ứng. Gõ tên con vật hay đồ vật (`con đà điểu`, `con voi`, `phở`, `pizza`… khoảng 260 từ) hoặc gửi emoji thì nó xuất hiện trên sân khấu.
- **Quà tặng**: quà càng lớn hiệu ứng càng hoành tráng. Vũ Trụ và Sư Tử đẩy nhanh sang chương mới.
- **Đám đông** phía sau rạp đông dần theo số người xem live.

## 🎨 5 phong cách (đều thuần Việt)

| Phong cách | Trang phục | Không gian |
|---|---|---|
| **A · Truyền thống đỏ – vàng** (mặc định) | Áo dài đỏ + khăn vấn · áo dài xanh + khăn đóng | Cổng Song Hỷ, đèn lồng, cành đào, mâm quả |
| **B · Sang trọng trắng – vàng** | Áo dài cưới trắng thêu vàng | Sảnh tiệc nhà hàng |
| **C · Sân vườn miền Tây** | Áo dài hồng · áo dài xanh lá | Rạp cưới sân vườn |
| **D · Hiện đại Sài Gòn** | Áo dài trắng · áo dài đen | Sảnh tối hiện đại, đèn vàng |
| **E · Cung đình Huế** | Áo dài vàng hoàng gia · áo dài đỏ | Sắc vàng – đỏ cung đình |

## 🕹️ Chế độ chơi

Đám cưới truyền thống · Nhà gái đấu nhà trai · Đua yêu thương hai họ · Kịp giờ lành · Đấu quà mừng · Đám cưới đúng giờ lành.

## 🖥️ Địa chỉ

- `http://localhost:3000/?obs=1`: sân khấu để live (dọc 9:16, không có nút)
- `http://localhost:3000/`: sân khấu có nút chạy thử
- `http://localhost:3000/?layout=landscape`: bản ngang 16:9
- `http://localhost:3000/admin`: trang quản lý
- `http://localhost:3000/?debug=1`: bảng gỡ lỗi (Ctrl+Shift+D)

## 🛠️ Dành cho người phát triển

```bash
npm run check    # lint + build kiểm tra + test
npm run build    # kiểm tra module, cấu hình, 5 phong cách × 5 cảnh, nhạc, từ điển con vật
npm test
```

- `src/config/`: cấu hình mặc định (`wedding.config.json`, `gifts.config.json`). Chỉnh sửa trong trang quản lý được lưu ở `data/config/`. Cấu hình cũ (bản tiếng Anh) tự chuyển sang bản Việt khi khởi động.
- `src/gameplay/announcer.js`: các câu MC đọc to.
- `src/gameplay/`: luật chơi, điểm, các thanh đo, bảng xếp hạng, chế độ chơi.
- `src/events/`: chuẩn hóa sự kiện, chống spam, hàng đợi hiệu ứng.
- `src/tiktok/`: kết nối TikTok LIVE.
- `public/js/`: sân khấu (nhân vật SVG, bối cảnh, hiệu ứng, âm thanh, HUD) và trang quản lý.
- `scripts/open-live-window.js`: mở cửa sổ sân khấu dọc (`npm run live`).

Đặt `ADMIN_TOKEN` để bảo vệ trang quản lý (gửi kèm header `x-admin-token` hoặc `?token=`).

Toàn bộ hình ảnh được vẽ bằng SVG/Canvas trong code. Nhạc ngũ cung và hiệu ứng âm thanh được tổng hợp trực tiếp bằng WebAudio.
