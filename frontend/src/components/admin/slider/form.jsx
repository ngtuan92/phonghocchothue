import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import {
    Card,
    CardBody,
    CardFooter,
    DialogHeader,
    Typography,
    Input,
    Button,
} from "@material-tailwind/react";

// eslint-disable-next-line no-undef
const URL_API = process.env.NEXT_PUBLIC_URL_API || "http://localhost:3000/"

function FormSliderComponent({ open, id, handleOpen, onSave, dataEdit }) {
    const [sliderName, setSliderName] = useState("");
    const [singleImage, setSingleImage] = useState(null);

    const [errors, setErrors] = useState({});


    const handleSingleImageChange = (event) => {
        const file = event.target.files[0];
        if (file) {
            setSingleImage(file);
        }
        setErrors((prev) => ({ ...prev, image: "" }));
    };

    const removeSingleImage = () => {
        setSingleImage(null);
    };

    useEffect(() => {
        if (open) {
            if (dataEdit) {
                setSliderName(dataEdit.name || "");
                if (dataEdit.image) {
                    setSingleImage(`${URL_API}${dataEdit.image.replaceAll('\\', '/')}`);
                } else {
                    setSingleImage(null);
                }
            } else {
                setSliderName("");
                setSingleImage(null);
            }
        }
    }, [open, dataEdit]);


    const handleSliderNameChange = (event) => {
        setSliderName(event.target.value);
        setErrors((prev) => ({ ...prev, sliderName: "" }));
    };


    const validateInputs = () => {
        const newErrors = {};
        if (!sliderName.trim()) {
            newErrors.sliderName = "Tên slider không được để trống.";
        }
        if (!singleImage) {
            newErrors.image = "Ảnh slider không được để trống.";
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = () => {
        if (validateInputs()) {
            const data = {
                name: sliderName,
                image: singleImage,
            };

            onSave(data);
        }
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Overlay */}
            <button
                type="button"
                className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity border-0 p-0 cursor-pointer"
                onClick={handleOpen}
                onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                        handleOpen();
                    }
                }}
                aria-label="Đóng dialog"
            />
            
            {/* Dialog Content */}
            <Card className="relative w-full max-w-2xl shadow-2xl max-h-[90vh] flex flex-col bg-white rounded-lg overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-200">
                    <DialogHeader className="flex flex-col items-start p-0">
                        <Typography className="text-2xl font-bold text-[#15803d]" variant="h4">
                            {id ? "✏️ Chỉnh sửa slider" : "➕ Thêm slider mới"}
                        </Typography>
                        <Typography variant="small" className="text-gray-500 mt-1">
                            {id ? "Cập nhật thông tin slider" : "Điền thông tin để thêm slider mới"}
                        </Typography>
                    </DialogHeader>
                    <button
                        onClick={handleOpen}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                        aria-label="Đóng"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                            className="h-6 w-6 text-gray-600"
                        >
                            <path
                                fillRule="evenodd"
                                d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z"
                                clipRule="evenodd"
                            />
                        </svg>
                    </button>
                </div>

                <CardBody className="flex flex-col gap-6 overflow-y-auto px-6 py-6 flex-1 min-h-0">
                    {/* Tên slider */}
                    <div>
                        <label htmlFor="slider-name" className="block text-sm font-medium text-gray-700 mb-2">
                            Tên slider <span className="text-red-500">*</span>
                        </label>
                        <Input
                            id="slider-name"
                            size="lg"
                            className="!border-gray-300 focus:!border-[#15803d] placeholder:!text-gray-600"
                            value={sliderName}
                            onChange={handleSliderNameChange}
                            error={!!errors.sliderName}
                            placeholder="Nhập tên slider..."
                        />
                        {errors.sliderName && (
                            <Typography variant="small" color="red" className="mt-1 flex items-center gap-1">
                                <span>⚠️</span> {errors.sliderName}
                            </Typography>
                        )}
                    </div>

                    {/* Ảnh slider */}
                    <div>
                        <label htmlFor="slider-image" className="block text-sm font-medium text-gray-700 mb-2">
                            Ảnh slider <span className="text-red-500">*</span>
                        </label>
                        <div className="flex flex-col gap-3">
                            <div className="relative">
                                <Input
                                    id="slider-image"
                                    type="file"
                                    size="lg"
                                    className="file-input cursor-pointer"
                                    onChange={handleSingleImageChange}
                                    accept="image/*"
                                />
                                <div className="absolute inset-0 flex items-center justify-end pr-3 pointer-events-none">
                                    <span className="text-sm text-gray-500">📁 Chọn ảnh</span>
                                </div>
                            </div>
                            {errors.image && (
                                <Typography variant="small" color="red" className="flex items-center gap-1">
                                    <span>⚠️</span> {errors.image}
                                </Typography>
                            )}
                            {singleImage && (
                                <div className="relative inline-block w-64 h-40 border-2 border-gray-200 rounded-lg overflow-hidden shadow-md">
                                    <img
                                        src={
                                            typeof singleImage === "string"
                                                ? singleImage
                                                : URL.createObjectURL(singleImage)
                                        }
                                        alt="Preview"
                                        className="w-full h-full object-cover"
                                    />
                                    <button
                                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm hover:bg-red-600 focus:outline-none shadow-lg transition-all"
                                        onClick={removeSingleImage}
                                        aria-label="Xóa ảnh"
                                    >
                                        ✕
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </CardBody>

                {/* Footer với nút lưu */}
                <CardFooter className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
                    <Button
                        variant="outlined"
                        onClick={handleOpen}
                        className="px-6 py-2 border-gray-300 text-gray-700 hover:bg-gray-100"
                    >
                        Hủy
                    </Button>
                    <Button
                        onClick={handleSave}
                        className="px-8 py-2 bg-gradient-to-r from-[#15803d] to-green-700 text-white font-medium rounded-lg shadow-md hover:from-green-700 hover:to-green-800 transition-all duration-200 transform hover:scale-105"
                    >
                        💾 Lưu thông tin
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}

FormSliderComponent.propTypes = {
    open: PropTypes.bool.isRequired,
    id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    handleOpen: PropTypes.func.isRequired,
    onSave: PropTypes.func.isRequired,
    dataEdit: PropTypes.shape({
        name: PropTypes.string,
        image: PropTypes.string,
    }),
};

export default FormSliderComponent;
