
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Loading from "../loading";
import Card from "../card";
import { handleInvalidToken } from "../../../utils/helpers";
import { showToastSuccess, showToastError } from "../../../helpers/toast";
import fetchData from "../../../axios";

import FormOther from "./form";

import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";

const columnHelper = createColumnHelper();

const URL_API = process.env.NEXT_PUBLIC_URL_API || "http://localhost:3000/";

export default function Other() {
  const [sorting, setSorting] = React.useState([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [data, setData] = useState([]);
  const [dataEdit, setDataEdit] = useState(null);
  const [id, setId] = React.useState(null);
  const [open, setOpen] = React.useState(false);
  const router = useRouter();

  useEffect(() => {
    handleCallApiGetConfig();
  }, []);

  const handleOpen = (id = null, dataEdit = null) => {
    setId(id);

    setDataEdit(dataEdit);
    setOpen((cur) => !cur);
  };

  const handleCallApiGetConfig = async () => {
    try {
      const res = await fetchData(`${URL_API}api/config`, "GET");
      setData(res.data);
    } catch (error) {
      if (error.response.data.message === "Invalid token") {
        handleInvalidToken(router);
      }
      showToastError("Lấy config thất bại");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveData = async (data) => {
    const formData = new FormData();

    formData.append("content", data.content);
    formData.append("type", data.type);
    formData.append("musicName", data.musicName);

    try {
      await fetchData(
        `${URL_API}api/config/update/${data.key}`,
        "PUT",
        formData,
        {
          "Content-Type": "multipart/form-data",
        }
      );

      showToastSuccess("Cập nhật config thành công");
    } catch (error) {
      if (error.response.data.message === "Invalid token") {
        handleInvalidToken(router);
      }
      showToastError("Cập nhật config thất bại");
    } finally {
      setOpen();
      handleCallApiGetConfig();
      setIsLoading(false);
    }
  };

  const columns = [
    columnHelper.accessor("key", {
      id: "key",
      header: () => (
        <p className="text-sm font-bold text-gray-600 dark:text-white">Tên</p>
      ),
      cell: (info) => (
        <p className="text-sm font-bold text-black">
          {info.getValue()}
        </p>
      ),
    }),
    columnHelper.accessor("content", {
      id: "content",
      header: () => (
        <p className="text-sm font-bold text-gray-600 dark:text-white">Mô tả</p>
      ),
      cell: (info) => {
        const value = info.getValue();
        const { musicName } = info.row.original;
        return info.row.original.type === "text" ? (
          <p className="text-sm font-bold text-black max-w-screen-sm truncate overflow-hidden text-ellipsis whitespace-nowrap hover:whitespace-normal">
            {value}
          </p>
        ) : info.row.original.type === "color" ? (
          <div
            className="w-[30px] h-[30px] rounded border"
            style={{ backgroundColor: value }}
          ></div>
        ) : info.row.original.type === "music" ? (
          <p className="text-sm font-bold text-black max-w-screen-sm truncate overflow-hidden text-ellipsis whitespace-nowrap hover:whitespace-normal">
            {musicName}
          </p>
        ) : (
          <img
            className="w-[100px] h-[60px]"
            src={`${URL_API}${value.replace(/\\/g, "/")}`}
            alt="logo"
          />
        );
      },
    }),

    columnHelper.accessor("action", {
      id: "action",
      header: () => (
        <p className=" text-sm font-bold text-gray-600 dark:text-white">
          Action
        </p>
      ),
      cell: (info) => (
        <p className="text-sm font-bold text-black">
          <button
            onClick={() => handleOpen(info.row.original.id, info.row.original)}
            className="relative h-10 max-h-[40px] w-10 max-w-[40px] select-none rounded-lg text-center align-middle font-sans text-xs font-medium uppercase text-primary transition-all hover:bg-gray-900/10 active:bg-gray-900/20 disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none"
            type="button"
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
        </p>
      ),
    }),
  ]; // eslint-disable-next-line

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
    <Card extra={"h-full px-6 pb-6 "}>
      {isLoading && <Loading />}

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
                        className="cursor-pointer border-b-[1px] border-primary pt-4 pb-2 pr-4 text-start "
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
              {table.getRowModel().rows.map((row) => {
                return (
                  <tr key={row.id}>
                    {row.getVisibleCells().map((cell) => {
                      return (
                        <td
                          key={cell.id}
                          className="min-w-[150px] text-left border-white/0 py-3 pr-4 break-words whitespace-normal text-black"
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
      <FormOther
        open={open}
        id={id}
        handleOpen={handleOpen}
        onSave={handleSaveData}
        dataEdit={dataEdit}
      />
    </Card>
  );
}
