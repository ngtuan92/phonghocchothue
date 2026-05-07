"use client";

import React, { useState, useEffect } from "react";
import {
  TextInput,
  FileInput,
  Button,
  Table,
  Group,
  Stack,
  Paper,
  Text,
  Badge,
  ActionIcon,
  Tooltip,
  Box,
  Title,
  Modal,
} from "@mantine/core";
import {
  MdDelete,
  MdFileUpload,
  MdFontDownload,
  MdEdit,
  MdWarning
} from "react-icons/md";
import { showToastSuccess, showToastError } from "../../helpers/toast";
import fetchData from "../../axios";

const URL_API = (process.env.NEXT_PUBLIC_URL_API || "http://localhost:8080/").replace(/\/$/, "") + "/";

interface LocalFont {
  id: number;
  display_name: string;
  font_family: string;
  file_url: string;
  file_type: string;
  file_size_kb: number;
  status: string;
}

export default function FontManagement() {
  const [fonts, setFonts] = useState<LocalFont[]>([]);
  const [displayName, setDisplayName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Edit State
  const [editFont, setEditFont] = useState<LocalFont | null>(null);
  const [editName, setEditName] = useState("");
  const [editFile, setEditFile] = useState<File | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [updating, setUpdating] = useState(false);

  // Delete State
  const [fontToDelete, setFontToDelete] = useState<LocalFont | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  useEffect(() => {
    fetchLocalFonts();
  }, []);

  const fetchLocalFonts = async () => {
    setLoading(true);
    try {
      const res = await fetchData(`${URL_API}api/fonts/local`, "GET");
      if (res.success) {
        setFonts(res.data);
      }
    } catch (error) {
      console.error("Error fetching local fonts:", error);
      showToastError("Không thể tải danh sách font local");
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !displayName) {
      showToastError("Vui lòng nhập tên hiển thị và chọn file font");
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("display_name", displayName);

    try {
      await fetchData(`${URL_API}api/fonts/local/upload`, "POST", formData, {
        "Content-Type": "multipart/form-data",
      });

      showToastSuccess("Tải lên font thành công!");
      setDisplayName("");
      setFile(null);
      fetchLocalFonts();
    } catch (error: any) {
      console.error("Error uploading font:", error);
      showToastError(error?.response?.data?.message || "Lỗi khi tải lên font");
    } finally {
      setUploading(false);
    }
  };

  const handleUpdateFont = async () => {
    if (!editFont) return;

    setUpdating(true);
    const formData = new FormData();
    if (editName) formData.append("display_name", editName);
    if (editFile) formData.append("file", editFile);

    try {
      await fetchData(`${URL_API}api/fonts/local/${editFont.id}`, "PUT", formData, {
        "Content-Type": "multipart/form-data",
      });
      showToastSuccess("Cập nhật font thành công");
      setIsEditOpen(false);
      setEditFile(null);
      fetchLocalFonts();
    } catch (error: any) {
      console.error("Error updating font:", error);
      showToastError(error?.response?.data?.message || "Lỗi khi cập nhật font");
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!fontToDelete) return;

    try {
      await fetchData(`${URL_API}api/fonts/local/${fontToDelete.id}`, "DELETE");
      showToastSuccess("Đã xóa font thành công");
      setIsDeleteOpen(false);
      fetchLocalFonts();
    } catch (error) {
      console.error("Error deleting font:", error);
      showToastError("Lỗi khi xóa font");
    }
  };

  const injectFontPreview = (font: LocalFont) => {
    const styleId = `font-preview-${font.font_family}`;
    if (!document.getElementById(styleId)) {
      const style = document.createElement("style");
      style.id = styleId;
      style.innerHTML = `
        @font-face {
          font-family: '${font.font_family}';
          src: url('${URL_API}${font.file_url.replace(/^\//, "")}') format('${font.file_type === 'ttf' ? 'truetype' : (font.file_type === 'otf' ? 'opentype' : font.file_type)}');
        }
      `;
      document.head.appendChild(style);
    }
  };

  const openEditModal = (font: LocalFont) => {
    setEditFont(font);
    setEditName(font.display_name);
    setEditFile(null);
    setIsEditOpen(true);
  };

  const openDeleteModal = (font: LocalFont) => {
    setFontToDelete(font);
    setIsDeleteOpen(true);
  };

  return (
    <Stack gap="xl" p="md">
      <Paper shadow="sm" radius="md" p="xl" withBorder>
        <Group mb="lg">
          <MdFileUpload size={24} className="text-primary" />
          <Title order={3}>Thêm Font Chữ Local</Title>
        </Group>

        <form onSubmit={handleUpload}>
          <Stack gap="md">
            <Group grow align="flex-end">
              <TextInput
                label="Tên hiển thị font"
                placeholder="Vd: Be Vietnam Pro SemiBold"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.currentTarget.value)}
                radius="md"
              />
              <FileInput
                label="File Font (.ttf, otf, .woff, .woff2)"
                placeholder="Chọn file font từ máy tính"
                required
                accept=".ttf,.woff,.woff2,.otf"
                value={file}
                onChange={setFile}
                leftSection={<MdFontDownload size={18} />}
                radius="md"
              />
            </Group>

            <Box mt="sm">
              <Button
                type="submit"
                fullWidth
                loading={uploading}
                leftSection={<MdFileUpload size={20} />}
                radius="md"
                color="green"
                h={42}
              >
                Tải lên và Đăng ký Font
              </Button>
            </Box>
          </Stack>
        </form>
      </Paper>

      <Paper shadow="sm" radius="md" p="xl" withBorder>
        <Group mb="lg" justify="space-between">
          <Title order={3}>Danh sách Font Local</Title>
          <Badge variant="light" size="lg" radius="md">{fonts.length} Fonts</Badge>
        </Group>

        <Box style={{ overflowX: 'auto' }}>
          <Table verticalSpacing="md" highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Tên hiển thị</Table.Th>
                <Table.Th>Font Family (Slug)</Table.Th>
                <Table.Th>Định dạng</Table.Th>
                <Table.Th style={{ textAlign: 'right' }}>Thao tác</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {fonts.length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={4}>
                    <Text ta="center" py="xl" c="dimmed">Chưa có font nào được tải lên</Text>
                  </Table.Td>
                </Table.Tr>
              ) : (
                fonts.map((font) => {
                  injectFontPreview(font);
                  return (
                    <Table.Tr key={font.id}>
                      <Table.Td>
                        <Text
                          fw={500}
                          style={{
                            fontFamily: `'${font.font_family}', sans-serif`,
                            fontSize: '1.2rem'
                          }}
                        >
                          {font.display_name}
                        </Text>
                
                      </Table.Td>
                      <Table.Td>
                        <Badge variant="outline" color="gray" radius="sm">{font.font_family}</Badge>
                      </Table.Td>
                      <Table.Td>
                        <Badge color="blue" variant="light">{font.file_type.toUpperCase()}</Badge>
                      </Table.Td>
                      <Table.Td>
                        <Group justify="flex-end" gap="xs">
                          <Tooltip label="Chỉnh sửa font">
                            <ActionIcon
                              variant="light"
                              color="blue"
                              onClick={() => openEditModal(font)}
                              radius="md"
                            >
                              <MdEdit size={18} />
                            </ActionIcon>
                          </Tooltip>
                          <Tooltip label="Xóa font">
                            <ActionIcon
                              variant="light"
                              color="red"
                              onClick={() => openDeleteModal(font)}
                              radius="md"
                            >
                              <MdDelete size={18} />
                            </ActionIcon>
                          </Tooltip>
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  );
                })
              )}
            </Table.Tbody>
          </Table>
        </Box>
      </Paper>

      <Modal
        opened={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title="Chỉnh sửa Font chữ"
        centered
        radius="md"
      >
        <Stack gap="md">
          <TextInput
            label="Tên hiển thị mới"
            required
            value={editName}
            onChange={(e) => setEditName(e.currentTarget.value)}
          />
          <FileInput
            label="Thay đổi file Font (Tùy chọn)"
            placeholder="Chọn file mới nếu muốn thay thế"
            accept=".ttf,.woff,.woff2,.otf"
            value={editFile}
            onChange={setEditFile}
            leftSection={<MdFontDownload size={18} />}
          />
          <Text size="xs" c="dimmed">
            Lưu ý: Nếu bạn tải file mới, file cũ sẽ bị xóa khỏi server.
          </Text>
          <Button color="green" onClick={handleUpdateFont} loading={updating}>Lưu thay đổi</Button>
        </Stack>
      </Modal>

      <Modal
        opened={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        title="Xác nhận xóa font"
        centered
        radius="md"
      >
        <Stack align="center" gap="md">
          <MdWarning size={48} color="orange" />
          <Text ta="center">
            Bạn có chắc chắn muốn xóa font <b>"{fontToDelete?.display_name}"</b>?
            Hành động này không thể hoàn tác và có thể ảnh hưởng đến hiển thị của trang web.
          </Text>
          <Group grow w="100%">
            <Button variant="outline" color="gray" onClick={() => setIsDeleteOpen(false)}>Hủy</Button>
            <Button color="red" onClick={handleDelete}>Xác nhận xóa</Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
