/* global process */
import { useEffect, useState } from "react";
import fetchData from "../../axios";
import { showToastError, showToastSuccess } from "../../helpers/toast";

const URL_API = (process.env.NEXT_PUBLIC_URL_API || "http://localhost:3000/").replace(/\/$/, "") + "/";

export default function FontsManager() {
  const [fonts, setFonts] = useState([]);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    fetchFonts();
  }, []);

  const injectFontPreview = (font) => {
    if (!font.url || !font.url.startsWith("http") || typeof document === "undefined") return;

    const linkId = `font-preview-${font.id}`;
    if (document.getElementById(linkId)) return;

    const link = document.createElement("link");
    link.id = linkId;
    link.href = font.url;
    link.rel = "stylesheet";
    document.head.appendChild(link);
  };

  const fetchFonts = async () => {
    try {
      const data = await fetchData(`${URL_API}api/fonts`, "GET");
      const fontList = Array.isArray(data) ? data : [];
      setFonts(fontList);
      fontList.forEach(injectFontPreview);
    } catch (e) {
      console.error("Failed to fetch fonts:", e);
      showToastError("Không thể tải danh sách font");
    }
  };

  const handleAddFont = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const isDuplicate = fonts.some((font) => font.name.trim().toLowerCase() === name.trim().toLowerCase());
    if (isDuplicate) {
      showToastError(`Font "${name}" đã tồn tại trong danh sách!`);
      setLoading(false);
      return;
    }

    try {
      await fetchData(`${URL_API}api/fonts`, "POST", { name, url });
      setName("");
      setUrl("");
      await fetchFonts();
      showToastSuccess("Thêm font thành công! Hãy refresh lại trang để font mới được nạp vào editor.");
    } catch (e) {
      console.error(e);
      showToastError(e?.response?.data?.message || "Lỗi khi thêm font");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFont = async () => {
    if (!selectedId) return;

    try {
      await fetchData(`${URL_API}api/fonts/${selectedId}`, "DELETE");
      showToastSuccess("Đã xóa font thành công.");
      await fetchFonts();
    } catch (e) {
      console.error(e);
      showToastError(e?.response?.data?.message || "Lỗi khi xóa font.");
    } finally {
      setShowConfirm(false);
      setSelectedId(null);
    }
  };

  const openConfirm = (id) => {
    setSelectedId(id);
    setShowConfirm(true);
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Quản lý Font Tùy Chỉnh (Google Fonts)</h2>
      <form onSubmit={handleAddFont} className="mb-8 p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <h3 className="font-semibold mb-2">Thêm Font Mới</h3>
        {error && <div className="text-red-500 mb-2 text-sm">{error}</div>}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm mb-1 text-gray-700">Tên Font (Vd: Space Grotesk)</label>
            <input
              type="text"
              className="w-full p-2 border border-gray-300 rounded focus:ring focus:ring-green-200 outline-none"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm mb-1 text-gray-700">URL Google Font</label>
            <input
              type="url"
              className="w-full p-2 border border-gray-300 rounded focus:ring focus:ring-green-200 outline-none"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://fonts.googleapis.com/css2?family=..."
              required
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded shadow transition-colors disabled:opacity-50"
        >
          {loading ? "Đang xử lý..." : "Thêm Font"}
        </button>
      </form>

      <h3 className="font-semibold mb-2">Danh sách Font đã thêm</h3>
      {fonts.length === 0 ? (
        <p className="text-gray-500 italic">Chưa có font nào được thêm.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200 rounded-lg">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="py-3 px-4 text-left font-semibold text-gray-700">Tên Font</th>
                <th className="py-3 px-4 text-left font-semibold text-gray-700">URL</th>
                <th className="py-3 px-4 text-right font-semibold text-gray-700">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {fonts.map((font) => (
                <tr key={font.id} className="hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-4 font-medium" style={{ fontFamily: `'${font.name}', sans-serif` }}>
                    {font.name}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600 truncate max-w-xs" title={font.url}>
                    {font.url}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => openConfirm(font.id)}
                      className="text-red-500 hover:text-red-700 text-sm font-semibold"
                    >
                      Xóa
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-sm w-full">
            <h3 className="text-lg font-bold mb-2">Xác nhận xóa</h3>
            <p className="text-gray-600 mb-6">Bạn có chắc chắn muốn xóa font chữ này không?</p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-100"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleDeleteFont}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
              >
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
