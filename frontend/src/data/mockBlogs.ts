export type BlogCategory = "kien-thuc" | "kinh-nghiem";
export type BlogStatus = "published" | "draft";

export interface Blog {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  content?: string;
  thumbnail: string;
  category: BlogCategory;
  status: BlogStatus;
  authorName?: string;
  publishedAt: string;
}

export const mockBlogs: Blog[] = [
  {
    id: 1,
    title: "5 Kinh nghiệm thu hút học viên khi mở lớp dạy kèm tại Đà Nẵng",
    slug: "5-kinh-nghiem-thu-hut-hoc-vien-day-kem-da-nang",
    excerpt:
      "Để lớp học luôn đông đảo học viên, ngoài chuyên môn tốt, không gian và cách tổ chức lớp học đóng vai trò cực kỳ quan trọng. Cùng Hoa Học Trò khám phá 5 bí quyết giúp giáo viên thu hút và giữ chân học viên hiệu quả.",
    thumbnail: "",
    category: "kinh-nghiem",
    status: "published",
    authorName: "Hoa Học Trò",
    publishedAt: "2026-04-15T08:30:00Z",
  },
  {
    id: 2,
    title: "Tiêu chuẩn chọn phòng học chất lượng: Ánh sáng, cách âm và thiết bị",
    slug: "tieu-chuan-chon-phong-hoc-chat-luong",
    excerpt:
      "Ánh sáng đủ, cách âm tốt, bàn ghế đúng chiều cao – nghe có vẻ đơn giản nhưng thực tế không phải phòng học nào cũng đạt được cả ba yếu tố. Bài viết giúp bạn biết cách chọn không gian lý tưởng.",
    thumbnail: "",
    category: "kien-thuc",
    status: "published",
    authorName: "Hoa Học Trò",
    publishedAt: "2026-04-12T10:00:00Z",
  },
  {
    id: 3,
    title: "Cách sắp xếp bàn ghế để tạo không gian học tương tác cao",
    slug: "cach-sap-xep-ban-ghe-khong-gian-tuong-tac",
    excerpt:
      "Thay vì xếp chữ U theo kiểu truyền thống, hãy thử các mô hình xếp bàn nhóm nhỏ để nâng cao hiệu quả làm việc nhóm. Một thay đổi nhỏ trong không gian, hiệu quả giảng dạy cải thiện bất ngờ.",
    thumbnail: "",
    category: "kinh-nghiem",
    status: "published",
    authorName: "Hoa Học Trò",
    publishedAt: "2026-04-10T14:15:00Z",
  },
];
