import { useEffect, useState } from "react";
import {
  Card,
  CardBody,
  Button,
  Input,
  Textarea,
  Switch,
  IconButton,
} from "@material-tailwind/react";
import { useRouter } from "next/navigation";
import fetchData from "@/axios";
import { handleInvalidToken } from "@/utils/helpers";
import { showToastSuccess, showToastError } from "@/helpers/toast";

const URL_API = process.env.NEXT_PUBLIC_URL_API || "http://localhost:3000/";

export default function RedirectPage() {
  const [redirects, setRedirects] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    fromPath: "",
    toPath: "",
    status: true,
    note: "",
  });

  const router = useRouter();

  const resetForm = () => {
    setEditingId(null);
    setForm({
      fromPath: "",
      toPath: "",
      status: true,
      note: "",
    });
  };

  const fetchRedirects = async () => {
    setIsLoading(true);
    try {
      const res = await fetchData(`${URL_API}api/redirect/list`);
      // fetchData đã trả về trực tiếp response.data nên res chính là mảng
      if (Array.isArray(res)) {
        setRedirects(res);
      } else {
        setRedirects([]);
      }
    } catch (error) {
      if (error?.response?.data?.message === "Invalid token") {
        handleInvalidToken(router);
      }
      showToastError("Lấy danh sách redirect thất bại");
      setRedirects([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.title = "Admin | Redirect";
    }
    fetchRedirects();
  }, []);

  const handleChange = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    setForm({
      fromPath: item.fromPath || "",
      toPath: item.toPath || "",
      status: !!item.status,
      note: item.note || "",
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa redirect này?")) return;
    setIsLoading(true);
    try {
      await fetchData(`${URL_API}api/redirect/${id}`, "DELETE");
      showToastSuccess("Xóa redirect thành công");
      fetchRedirects();
    } catch (error) {
      if (error?.response?.data?.message === "Invalid token") {
        handleInvalidToken(router);
      }
      showToastError("Xóa redirect thất bại");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.fromPath.trim() || !form.toPath.trim()) {
      showToastError("Vui lòng nhập đầy đủ From URL và To URL");
      return;
    }

    const payload = {
      fromPath: form.fromPath.trim(),
      toPath: form.toPath.trim(),
      status: form.status,
      note: form.note.trim() || null,
    };

    setIsLoading(true);
    try {
      if (editingId) {
        await fetchData(`${URL_API}api/redirect/${editingId}`, "PUT", payload);
        showToastSuccess("Cập nhật redirect thành công");
      } else {
        await fetchData(`${URL_API}api/redirect`, "POST", payload);
        showToastSuccess("Thêm redirect thành công");
      }
      resetForm();
      fetchRedirects();
    } catch (error) {
      if (error?.response?.data?.message === "Invalid token") {
        handleInvalidToken(router);
      }
      const msg =
        error?.response?.data?.message ||
        (editingId ? "Cập nhật redirect thất bại" : "Thêm redirect thất bại");
      showToastError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-4 md:p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#15803d]">
            Quản lý Redirect URL
          </h1>
          <p className="text-gray-600 text-sm mt-1">
            Thiết lập các đường dẫn cũ sẽ được chuyển hướng sang đường dẫn mới.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Form */}
        <Card className="shadow-md border border-gray-100">
          <CardBody className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-800 mb-2">
              {editingId ? "Chỉnh sửa redirect" : "Thêm redirect mới"}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  From URL (đường dẫn cũ) <span className="text-red-500">*</span>
                </label>
                <Input
                  size="lg"
                  value={form.fromPath}
                  onChange={(e) => handleChange("fromPath", e.target.value)}
                  placeholder="/phong/san-pham-1"
                  className="!border-gray-300 focus:!border-[#15803d]"
                />
                <p className="text-[11px] text-gray-500 mt-1">
                  Chỉ nhập path, không cần domain. Ví dụ: /phong/san-pham-1
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  To URL (đường dẫn mới){" "}
                  <span className="text-red-500">*</span>
                </label>
                <Input
                  size="lg"
                  value={form.toPath}
                  onChange={(e) => handleChange("toPath", e.target.value)}
                  placeholder="/phong/san-pham-new"
                  className="!border-gray-300 focus:!border-[#15803d]"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">
                    Trạng thái
                  </p>
                  <p className="text-[12px] text-gray-500">
                    Chỉ redirect khi trạng thái đang bật.
                  </p>
                </div>
                <div className="flex items-center gap-2 px-2 py-1 rounded-full border border-gray-200 shadow-sm bg-gray-50">
                  <span
                    className={`text-xs font-medium ${
                      form.status ? "text-green-700" : "text-gray-400"
                    }`}
                  >
                    {form.status ? "Đang bật" : "Đang tắt"}
                  </span>
                  <input
                    type="checkbox"
                    checked={form.status}
                    onChange={(e) => handleChange("status", e.target.checked)}
                    className={`h-5 w-5 accent-green-600 border-gray-300 transition-all duration-300 outline-none ring-0 focus:ring-2 focus:ring-green-400 ${
                      form.status ? "ring-2 ring-green-400" : ""
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ghi chú (tùy chọn)
                </label>
                <Textarea
                  rows={3}
                  value={form.note}
                  onChange={(e) => handleChange("note", e.target.value)}
                  placeholder="Ví dụ: Redirect cho chiến dịch cũ, URL cũ đã chạy quảng cáo..."
                  className="!border-gray-300 focus:!border-[#15803d]"
                />
              </div>

              <div className="flex gap-3 justify-end pt-2">
                {editingId && (
                  <Button
                    variant="outlined"
                    color="gray"
                    onClick={resetForm}
                    type="button"
                  >
                    Hủy
                  </Button>
                )}
                <Button
                  type="submit"
                  color="green"
                  disabled={isLoading}
                  className="flex items-center gap-2"
                >
                  {editingId ? "💾 Cập nhật" : "➕ Thêm mới"}
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>

        {/* Table */}
        <Card className="w-full h-full px-6 pb-6 sm:overflow-x-auto shadow-md border border-gray-100">
          <CardBody className="space-y-4 p-0 pt-4">
            <div className="flex items-center justify-between px-2 md:px-0">
              <h2 className="text-lg font-semibold text-gray-800">
                Danh sách redirect
              </h2>
              <span className="text-xs font-medium text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                Tổng: {redirects.length}
              </span>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="py-3 pr-4 pl-2 text-left text-xs font-bold uppercase text-gray-600">
                      From URL
                    </th>
                    <th className="py-3 pr-4 text-left text-xs font-bold uppercase text-gray-600">
                      To URL
                    </th>
                    <th className="py-3 pr-4 text-center text-xs font-bold uppercase text-gray-600">
                      Trạng thái
                    </th>
                    <th className="py-3 pr-4 text-left text-xs font-bold uppercase text-gray-600">
                      Ghi chú
                    </th>
                    <th className="py-3 pr-4 text-center text-xs font-bold uppercase text-gray-600">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {redirects.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="py-6 text-center text-sm text-gray-500"
                      >
                        Chưa có redirect nào
                      </td>
                    </tr>
                  )}
                  {redirects.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                    >
                      <td className="min-w-[180px] py-3 pr-4 pl-2 text-xs md:text-sm font-mono text-blue-700">
                        {item.fromPath}
                      </td>
                      <td className="min-w-[180px] py-3 pr-4 text-xs md:text-sm font-mono text-green-700">
                        {item.toPath}
                      </td>
                      <td className="py-3 pr-4 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-[11px] font-medium ${
                            item.status
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-200 text-gray-600"
                          }`}
                        >
                          {item.status ? "Đang bật" : "Tắt"}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-sm text-gray-700 max-w-[220px] truncate">
                        {item.note || "-"}
                      </td>
                      <td className="py-3 pr-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <IconButton
                            variant="text"
                            color="green"
                            onClick={() => handleEdit(item)}
                          >
                            ✏️
                          </IconButton>
                          <IconButton
                            variant="text"
                            color="red"
                            onClick={() => handleDelete(item.id)}
                          >
                            🗑️
                          </IconButton>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}


