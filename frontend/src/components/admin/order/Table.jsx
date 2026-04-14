import React, { useCallback, useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import Card from "../card";
const Confirm = dynamic(() => import("../confirm"), { ssr: false });

import Loading from "../loading";
import fetchData from "../../../axios"
import { handleInvalidToken } from "../../../utils/helpers"

import { showToastSuccess, showToastError } from '../../../helpers/toast'

import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";

const columnHelper = createColumnHelper();

// eslint-disable-next-line no-undef
const URL_API = process.env.NEXT_PUBLIC_URL_API || "http://localhost:3000/";

const formatDate = (isoDate) => {
  if (!isoDate) return "—";
  const date = new Date(isoDate);
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const year = date.getUTCFullYear();
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");

  return `${day}/${month}/${year} ${hours}:${minutes}`;
};

const buildColumns = (handleOpen, handleOpenConfirm) => [
  columnHelper.accessor("full_name", {
    id: "full_name",
    header: () => (
      <p className="text-sm font-bold text-gray-600 dark:text-white">Tên</p>
    ),
    cell: (info) => (
      <p className="text-sm font-bold text-black">
        {info.getValue()}
      </p>
    ),
  }),
  columnHelper.accessor("email", {
    id: "email",
    header: () => (
      <p className="text-sm font-bold text-gray-600 dark:text-white">Email</p>
    ),
    cell: (info) => (
      <p className="text-sm font-bold text-black">
        {info.getValue()}
      </p>
    ),
  }),
  columnHelper.accessor("phone", {
    id: "phone",
    header: () => (
      <p className="text-sm font-bold text-gray-600 dark:text-white">Số điện thoại</p>
    ),
    cell: (info) => (
      <p className="text-sm font-bold text-black">
        {info.getValue()}
      </p>
    ),
  }),
  columnHelper.accessor("student_number", {
    id: "student_number",
    header: () => (
      <p className="text-sm font-bold text-gray-600 dark:text-white">Số học sinh</p>
    ),
    cell: (info) => (
      <p className="text-sm font-bold text-black">
        {info.getValue()}
      </p>
    ),
  }),
  columnHelper.accessor("product.name", {
    id: "product.name",
    header: () => (
      <p className="text-sm font-bold text-gray-600 dark:text-white">Phòng</p>
    ),
    cell: (info) => (
      <p className="text-sm font-bold text-black">
        {info.getValue()}
      </p>
    ),
  }),
  columnHelper.accessor("product.image", {
    id: "product.image",
    header: () => (
      <p className="text-sm font-bold text-gray-600 dark:text-white">Ảnh</p>
    ),
    cell: (info) => {
      const value = info.getValue();
      if (!value) {
        return <p className="text-sm font-bold text-black">—</p>;
      }
      return (
        <div className="text-sm font-bold text-black">
          <img
            className="w-[100px] h-[60px] object-cover rounded-lg border border-gray-200"
            src={`${URL_API}${value.replaceAll("\\", "/")}`}
            alt="room"
          />
        </div>
      );
    },
  }),
  columnHelper.accessor("note", {
    id: "note",
    header: () => (
      <p className="text-sm font-bold text-gray-600 dark:text-white">Lưu ý</p>
    ),
    cell: (info) => (
      <p className="text-sm font-bold text-black">
        {info.getValue()}
      </p>
    ),
  }),
  columnHelper.accessor("date", {
    id: "date",
    header: () => (
      <p className="text-sm font-bold text-gray-600 dark:text-white">
        Ngày đặt
      </p>
    ),
    cell: (info) => (
      <p className="text-sm font-bold text-black">
        {formatDate(info.getValue())}
      </p>
    ),
  }),
  columnHelper.accessor("action", {
    id: "action",
    header: () => (
      <p className="text-sm font-bold text-gray-600 dark:text-white">Action</p>
    ),
    cell: (info) => (
      <p className="text-sm font-bold text-black">
        <button
          onClick={() => handleOpen(info.row.original)}
          className="relative h-10 max-h-[40px] w-10 max-w-[40px] select-none rounded-lg text-center align-middle font-sans text-xs font-medium uppercase text-primary transition-all hover:bg-gray-900/10 active:bg-gray-900/20 disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none"
          type="button">
          <span className="absolute transform -translate-x-1/2 -translate-y-1/2 top-1/2 left-1/2">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"
              className="w-4 h-4">
              <path
                d="M21.731 2.269a2.625 2.625 0 00-3.712 0l-1.157 1.157 3.712 3.712 1.157-1.157a2.625 2.625 0 000-3.712zM19.513 8.199l-3.712-3.712-12.15 12.15a5.25 5.25 0 00-1.32 2.214l-.8 2.685a.75.75 0 00.933.933l2.685-.8a5.25 5.25 0 002.214-1.32L19.513 8.2z">
              </path>
            </svg>
          </span>
        </button>
        <button
          onClick={() => handleOpenConfirm(info.row.original.id)}
          className="relative h-10 max-h-[40px] w-10 max-w-[40px] select-none rounded-lg text-center align-middle font-sans text-xs font-medium uppercase text-red transition-all hover:bg-gray-900/10 active:bg-gray-900/20 disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none"
          type="button">
          <span className="absolute transform -translate-x-1/2 -translate-y-1/2 top-1/2 left-1/2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </span>
        </button>
      </p>
    ),
  }),
];
export default function ComplexTable() {

  const [sorting, setSorting] = React.useState([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [data, setData] = useState([]);

  const [openConfirm, setOpenConfirm] = useState(false);
  const [id, setId] = React.useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const router = useRouter();

  const handleOpen = useCallback((order = null) => {
    setSelectedOrder(order);
  }, []);

  const handleOpenConfirm = useCallback((orderId = null) => {
    setId(orderId);
    setOpenConfirm((cur) => !cur);
  }, []);

  const handleConfirm = () => {

    handleRemoveData()

  }



  const fetchDataFromAPI = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetchData(`${URL_API}api/order`);
      console.log(response);

      if (response.data && Array.isArray(response.data) && response.data.length) {
        setData(response.data)
      } else {
        setData([])
      }
    } catch (error) {
      if (error.response.data.message === "Invalid token") {
        handleInvalidToken(router);
      }
      setData([])
    } finally {
      setIsLoading(false);

    }

  }, [router]);

  useEffect(() => {
    fetchDataFromAPI();
  }, [fetchDataFromAPI]);

  const handleRemoveData = async () => {
    const idOrder = id;
    handleOpenConfirm();
    setIsLoading(true);
    try {
      await fetchData(`${URL_API}api/order/delete/${idOrder}`, 'delete');

      showToastSuccess("Xóa đơn đặt thành công")
    } catch (error) {
      if (error.response?.data?.message === "Invalid token") {
        handleInvalidToken(router);
      }
      showToastError("Xóa đơn đặt thất bại")
    } finally {
      setIsLoading(false);
      fetchDataFromAPI();
    }
  }

  const columns = useMemo(
    () => buildColumns(handleOpen, handleOpenConfirm),
    [handleOpen, handleOpenConfirm]
  );

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    debugTable: true,
  });
  return (
    <Card extra={"w-full h-full px-6 pb-6 sm:overflow-x-auto"}>
      {isLoading && <Loading />}
      <div className="w-full flex justify-between items-center mt-3 pl-3">
        
      </div>
      {data.length ? (
        <div className="mt-8 overflow-x-scroll">
          <table className="w-full">
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id} className="!border-px !border-gray-400">
                  {headerGroup.headers.map((header) => {
                    return (
                      <th
                        key={header.id}
                        colSpan={header.colSpan}
                        onClick={header.column.getToggleSortingHandler()}
                        className="cursor-pointer border-b-[1px] border-primary pt-4 pb-2 pr-4 text-start"
                      >
                        <div className="items-center justify-between text-xs text-primary color-header-table">
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                          {{
                            asc: "",
                            desc: "",
                          }[header.column.getIsSorted()] ?? null}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              ))}
            </thead>
            <tbody>
              {table
                .getRowModel()
                .rows
                .map((row) => {
                  return (
                    <tr key={row.id}>
                      {row.getVisibleCells().map((cell) => {
                        return (
                          <td
                            key={cell.id}
                            className="min-w-[150px] border-white/0 py-3  pr-4"
                          >
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext()
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
            </tbody>
          </table>

        </div>
      ) : (
        <p>Không có dữ liệu</p>
      )}

      <OrderDetailDialog
        open={Boolean(selectedOrder)}
        order={selectedOrder}
        onClose={() => handleOpen(null)}
      />
      <Confirm open={openConfirm} id={id} handleOpen={handleOpenConfirm} onConfirm={handleConfirm} />
    </Card>
  );
}

function InfoRow({ label, value }) {
  return (
    <div>
      <p className="text-sm text-black">{label}</p>
      <p className="text-base font-semibold text-[#15803d] mt-0.5">{value || "—"}</p>
    </div>
  );
}

InfoRow.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
};

function OrderDetailDialog({ open, order, onClose }) {
  if (!open || !order) return null;

  const roomImage =
    order.product?.image ? `${URL_API}${order.product.image.replaceAll("\\", "/")}` : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity border-0 p-0 cursor-pointer"
        onClick={onClose}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            onClose();
          }
        }}
        aria-label="Đóng dialog"
      />

      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-200">
          <div>
            <p className="text-xs uppercase tracking-widest text-black">Chi tiết đơn đặt</p>
            <h2 className="text-2xl font-bold text-[#15803d] mt-1">{order.full_name || "Khách hàng"}</h2>
            <p className="text-sm text-black mt-1">
              {order.product?.name ? `Đơn đặt phòng ${order.product.name}` : "Thông tin liên hệ"}
            </p>
          </div>
          <button
            onClick={onClose}
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

        <div className="px-6 py-6 space-y-6 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <InfoRow label="Số điện thoại" value={order.phone} />
            <InfoRow label="Email" value={order.email} />
            <InfoRow label="Số lượng học sinh" value={order.student_number} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InfoRow label="Ngày đặt" value={formatDate(order.date)} />
            <InfoRow label="Lưu ý" value={order.note || "Không có"} />
          </div>

          {roomImage && (
            <div className="flex flex-col md:flex-row gap-4 items-start">
              <img
                src={roomImage}
                alt={order.product?.name || "Room image"}
                className="w-full md:w-64 h-40 object-cover rounded-xl border border-gray-200 shadow-md"
              />
              <div className="flex-1 space-y-2">
                <InfoRow label="Tên phòng" value={order.product?.name} />
                {/* <InfoRow
                  label="Giá phòng"
                  value={
                    order.product?.price
                      ? `${Number(order.product.price).toLocaleString()} đ`
                      : "—"
                  }
                /> */}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}

OrderDetailDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  order: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    full_name: PropTypes.string,
    phone: PropTypes.string,
    email: PropTypes.string,
    student_number: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    note: PropTypes.string,
    date: PropTypes.string,
    product: PropTypes.shape({
      name: PropTypes.string,
      image: PropTypes.string,
      price: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    }),
  }),
  onClose: PropTypes.func.isRequired,
};
