import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import Card from "../card";
import Confirm from "../confirm";
import Loading from "../loading";
import fetchData from "../../../axios";
import { handleInvalidToken } from "../../../utils/helpers";
import { showToastSuccess, showToastError } from "../../../helpers/toast";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";

const columnHelper = createColumnHelper();
const URL_API = process.env.NEXT_PUBLIC_URL_API || "http://localhost:8080/";

export default function ComplexTable() {
  const queryClient = useQueryClient();
  const [sorting, setSorting] = React.useState([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [data, setData] = useState([]);
  const [openConfirm, setOpenConfirm] = useState(false);
  const [id, setId] = React.useState(null);
  const router = useRouter();

  const handleOpenConfirm = (id = null) => {
    setId(id);
    setOpenConfirm((cur) => !cur);
  };

  const handleConfirm = () => {
    handleRemoveData();
  };

  useEffect(() => {
    fetchDataFromAPI();
  }, []);

  const fetchDataFromAPI = async () => {
    setIsLoading(true);
    try {
      const response = await fetchData(`${URL_API}api/product?light=true`);

      if (
        response.data &&
        Array.isArray(response.data) &&
        response.data.length
      ) {
        setData(response.data);
      } else {
        setData([]);
      }
    } catch (error) {
      if (error.response?.data?.message === "Invalid token") {
        handleInvalidToken(router);
      }
      setData([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveData = async () => {
    const idProduct = id;
    handleOpenConfirm();
    setIsLoading(true);
    try {
      await fetchData(`${URL_API}api/product/delete/${idProduct}`, "delete");
      showToastSuccess("Xóa phòng thành công");
      queryClient.invalidateQueries({ queryKey: ["products"] });
    } catch (error) {
      if (error.response?.data?.message === "Invalid token") {
        handleInvalidToken(router);
      }
      showToastError("Xóa phòng thất bại");
    } finally {
      setIsLoading(false);
      fetchDataFromAPI();
    }
  };

  const columns = [
    columnHelper.accessor("name", {
      id: "name",
      header: () => (
        <p className="text-sm font-bold text-gray-600 dark:text-white">Tên</p>
      ),
      cell: (info) => (
        <p className="text-sm font-bold text-black">
          {info.getValue()}
        </p>
      ),
    }),
    columnHelper.accessor("image", {
      id: "image",
      header: () => (
        <p className="text-sm font-bold text-gray-600 dark:text-white">Ảnh</p>
      ),
      cell: (info) => (
        <div className="text-sm font-bold text-black">
          {info.getValue() ? (
            <img
              className="w-[100px] h-[60px] object-cover rounded-lg border border-gray-100"
              src={`${URL_API}${info.getValue().replace(/\\/g, "/")}`}
              alt="room"
            />
          ) : (
            <div className="w-[100px] h-[60px] bg-gray-100 flex items-center justify-center text-xs text-gray-400">No image</div>
          )}
        </div>
      ),
    }),
    columnHelper.accessor("status", {
      id: "status",
      header: () => (
        <p className="text-sm font-bold text-gray-600 dark:text-white">
          Tình trạng
        </p>
      ),
      cell: (info) => (
        <div className="flex items-center">
          {info.getValue() == "1" ? (
            <div className="rounded-md bg-green-600 py-0.5 px-2.5 border border-transparent text-sm text-white transition-all shadow-sm">
              Còn trống
            </div>
          ) : (
            <div className="rounded-md bg-red-600 py-0.5 px-2.5 border border-transparent text-sm text-white transition-all shadow-sm">
              Hết phòng
            </div>
          )}
        </div>
      ),
    }),
    columnHelper.accessor("action", {
      id: "action",
      header: () => (
        <p className="text-sm font-bold text-gray-600 dark:text-white">
          Action
        </p>
      ),
      cell: (info) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => router.push(`/admin/products/edit/${info.row.original.id}`)}
            className="relative h-10 max-h-[40px] w-10 max-w-[40px] select-none rounded-lg text-center align-middle font-sans text-xs font-medium uppercase text-primary transition-all hover:bg-gray-900/10 active:bg-gray-900/20 disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none"
            type="button"
            title="Sửa"
          >
            <span className="absolute transform -translate-x-1/2 -translate-y-1/2 top-1/2 left-1/2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
                className="w-4 h-4"
              >
                <path d="M21.731 2.269a2.625 2.625 0 00-3.712 0l-1.157 1.157 3.712 3.712 1.157-1.157a2.625 2.625 0 000-3.712zM19.513 8.199l-3.712-3.712-12.15 12.15a5.25 5.25 0 00-1.32 2.214l-.8 2.685a.75.75 0 00.933.933l2.685-.8a5.25 5.25 0 002.214-1.32L19.513 8.2z"></path>
              </svg>
            </span>
          </button>
          <button
            onClick={() => handleOpenConfirm(info.row.original.id)}
            className="relative h-10 max-h-[40px] w-10 max-w-[40px] select-none rounded-lg text-center align-middle font-sans text-xs font-medium uppercase text-red transition-all hover:bg-gray-900/10 active:bg-gray-900/20 disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none"
            type="button"
            title="Xóa"
          >
            <span className="absolute transform -translate-x-1/2 -translate-y-1/2 top-1/2 left-1/2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="2"
                stroke="currentColor"
                className="w-6 h-6 text-red-500"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </span>
          </button>
        </div>
      ),
    }),
  ];

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
        <div>
          <button
            onClick={() => router.push("/admin/products/new")}
            className="w-full text-white bg-green-600 hover:bg-green-700 focus:ring-4 focus:outline-none focus:ring-primary-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-primary-600 dark:hover:bg-primary-700 dark:focus:ring-primary-800 font-bold"
            suppressHydrationWarning={true}
          >
            Thêm phòng
          </button>
        </div>
      </div>
      {data.length ? (
        <div className="mt-8 overflow-x-scroll">
          <table className="w-full">
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr
                  key={headerGroup.id}
                  className="!border-px !border-gray-400"
                >
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
        <p className="mt-4 text-sm font-semibold text-gray-500">Không có dữ liệu</p>
      )}

      <Confirm
        open={openConfirm}
        id={id}
        handleOpen={handleOpenConfirm}
        onConfirm={handleConfirm}
      />
    </Card>
  );
}
