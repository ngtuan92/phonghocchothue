import PropTypes from "prop-types";
import { Button, Card } from "@material-tailwind/react";

export default function Confirm({ open, handleOpen, onConfirm }) {
    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <button
                type="button"
                className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity border-0 p-0 cursor-pointer"
                onClick={() => handleOpen(false)}
                onKeyDown={(e) => {
                    if (e.key === "Escape") {
                        handleOpen(false);
                    }
                }}
                aria-label="Đóng dialog"
            />

            <Card className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden">
                <div className="px-6 pt-6 pb-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-[#15803d]">Xác nhận</h3>
                </div>

                <div className="px-6 py-6 text-sm text-gray-700">
                    Hành động này không thể hoàn tác sau khi thực hiện.
                </div>

                <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
                    <button
                        type="button"
                        onClick={() => handleOpen(false)}
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                        Hủy
                    </button>
                    <Button
                        onClick={onConfirm}
                        className="px-5 py-2 bg-red-600 text-white font-medium rounded-lg shadow-md hover:bg-red-700 transition-all duration-200"
                    >
                        Xóa
                    </Button>
                </div>
            </Card>
        </div>
    );
}

Confirm.propTypes = {
    open: PropTypes.bool.isRequired,
    handleOpen: PropTypes.func.isRequired,
    onConfirm: PropTypes.func.isRequired,
};
