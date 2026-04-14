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
    Textarea,
} from "@material-tailwind/react";

import ColorPicker from "../color-picker";

// eslint-disable-next-line no-undef
const URL_API = process.env.NEXT_PUBLIC_URL_API || "http://localhost:3000/";

function FormOtherComponent({ open, id, handleOpen, onSave, dataEdit }) {
    const [configContent, setConfigContent] = useState("");
    const [singleImage, setSingleImage] = useState(null);
    const [type, setType] = useState("text");
    const [singleMusic, setSingleMusic] = useState(null);
    const [singleMusicName, setSingleMusicName] = useState("");

    useEffect(() => {
        if (!open) return;

        const currentType = dataEdit?.type || "text";
        setType(currentType);

        setSingleImage(null);
        setSingleMusic(null);
        setSingleMusicName("");
        setConfigContent("");

        if (!dataEdit) return;

        if (currentType === "image" && dataEdit.content) {
            setSingleImage(`${URL_API}${dataEdit.content.replaceAll("\\", "/")}`);
        } else if (currentType === "music") {
            if (dataEdit.content) {
                setSingleMusic(`${URL_API}${dataEdit.content.replaceAll("\\", "/")}`);
            }
            setSingleMusicName(dataEdit.musicName || "");
        } else {
            setConfigContent(dataEdit.content || "");
        }
    }, [open, dataEdit]);

    const handleSingleImageChange = (event) => {
        const file = event.target.files[0];
        if (file) {
            setSingleImage(file);
        }
    };

    const handleConfigContentChange = (event) => {
        setConfigContent(event.target.value);
    };

    const handleChangeColor = (value) => {
        setConfigContent(value);
    };

    const handleMusicChange = (event) => {
        const file = event.target.files[0];
        if (file) {
            setSingleMusic(file);
        }
    };

    const handleMusicNameChange = (event) => {
        setSingleMusicName(event.target.value);
    };

    const removeSingleImage = () => {
        setSingleImage(null);
    };

    const removeSingleMusic = () => {
        setSingleMusic(null);
    };

    const handleSave = () => {
        if (!dataEdit) return;

        if (type === "image") {
            onSave({ key: dataEdit.key, content: singleImage, type, musicName: "" });
        } else if (type === "music") {
            onSave({ key: dataEdit.key, content: singleMusic, type, musicName: singleMusicName });
        } else {
            onSave({ key: dataEdit.key, content: configContent, type, musicName: "" });
        }
    };

    const renderContentByType = () => {
        switch (type) {
            case "color":
                return (
                    <div>
                        <Typography className="mb-2 font-semibold text-[#15803d]" variant="h6">
                            Chọn màu
                        </Typography>
                        <ColorPicker value={configContent} onChange={handleChangeColor} label="Chọn màu" />
                    </div>
                );
            case "image":
                return (
                    <div className="space-y-3">
                        <label htmlFor="other-image" className="block text-sm font-medium text-gray-700">
                            Ảnh cấu hình <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                            <Input
                                id="other-image"
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
                        {singleImage && (
                            <div className="relative inline-block w-64 h-40 border-2 border-gray-200 rounded-lg overflow-hidden shadow-md">
                                <img
                                    src={typeof singleImage === "string" ? singleImage : URL.createObjectURL(singleImage)}
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
                );
            case "music":
                return (
                    <div className="space-y-3">
                        <label htmlFor="music-name" className="block text-sm font-medium text-gray-700">
                            Tên bài hát
                        </label>
                        <Input
                            id="music-name"
                            type="text"
                            size="lg"
                            value={singleMusicName}
                            className="!border-gray-300 focus:!border-[#15803d] placeholder:!text-gray-600"
                            placeholder="Nhập tên bài hát"
                            onChange={handleMusicNameChange}
                        />
                        <label htmlFor="music-file" className="block text-sm font-medium text-gray-700">
                            File nhạc
                        </label>
                        <Input
                            id="music-file"
                            type="file"
                            size="lg"
                            className="file-input cursor-pointer"
                            onChange={handleMusicChange}
                            accept="audio/mp3,audio/*"
                        />
                        {singleMusic && (
                            <div className="relative w-full bg-gray-50 border border-gray-200 rounded-lg p-4">
                                <audio
                                    controls
                                    src={
                                        typeof singleMusic === "string"
                                            ? singleMusic
                                            : URL.createObjectURL(singleMusic)
                                    }
                                    className="w-full"
                                >
                                    <track kind="captions" />
                                </audio>
                                <button
                                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm hover:bg-red-600 focus:outline-none"
                                    onClick={removeSingleMusic}
                                    aria-label="Xóa nhạc"
                                >
                                    ✕
                                </button>
                            </div>
                        )}
                    </div>
                );
            case "text":
            default:
                return (
                    <div>
                        <label htmlFor="config-text" className="block text-sm font-medium text-gray-700 mb-2">
                            Nội dung hiển thị
                        </label>
                        <Textarea
                            id="config-text"
                            className="!border-gray-300 focus:!border-[#15803d] placeholder:!text-gray-600"
                            value={configContent}
                            onChange={handleConfigContentChange}
                            rows={6}
                            placeholder="Nhập nội dung hiển thị..."
                        />
                    </div>
                );
        }
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <button
                type="button"
                className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity border-0 p-0 cursor-pointer"
                onClick={handleOpen}
                onKeyDown={(event) => {
                    if (event.key === "Escape") {
                        handleOpen();
                    }
                }}
                aria-label="Đóng dialog"
            />

            <Card className="relative w-full max-w-3xl shadow-2xl max-h-[90vh] flex flex-col bg-white rounded-lg overflow-hidden">
                <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-200">
                    <DialogHeader className="flex flex-col items-start p-0">
                        <Typography className="text-2xl font-bold text-[#15803d]" variant="h4">
                            {id ? "✏️ Cập nhật cấu hình" : "⚙️ Thêm cấu hình"}
                        </Typography>
                        <Typography variant="small" className="text-gray-500 mt-1">
                            {type === "text" && "Chỉnh sửa nội dung văn bản hiển thị"}
                            {type === "color" && "Thay đổi màu sắc hiển thị trên trang"}
                            {type === "image" && "Cập nhật hình ảnh đại diện"}
                            {type === "music" && "Quản lý nhạc nền cho trang"}
                        </Typography>
                    </DialogHeader>
                    <button
                        onClick={handleOpen}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                        aria-label="Đóng"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6 text-gray-600">
                            <path
                                fillRule="evenodd"
                                d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z"
                                clipRule="evenodd"
                            />
                        </svg>
                    </button>
                </div>

                <CardBody className="flex flex-col gap-6 overflow-y-auto px-6 py-6 flex-1 min-h-0">
                    {renderContentByType()}
                </CardBody>

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

FormOtherComponent.propTypes = {
    open: PropTypes.bool.isRequired,
    id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    handleOpen: PropTypes.func.isRequired,
    onSave: PropTypes.func.isRequired,
    dataEdit: PropTypes.shape({
        key: PropTypes.string,
        type: PropTypes.string,
        content: PropTypes.string,
        musicName: PropTypes.string,
    }),
};

export default FormOtherComponent;
