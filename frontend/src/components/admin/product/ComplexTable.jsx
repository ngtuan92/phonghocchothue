/* global process */
/* eslint-disable react/prop-types */
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  closestCenter,
  DndContext,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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
  useReactTable,
} from "@tanstack/react-table";

const columnHelper = createColumnHelper();
const URL_API = process.env.NEXT_PUBLIC_URL_API || "http://localhost:8080/";
const SortableRowContext = React.createContext(null);

function DragHandle() {
  const sortable = React.useContext(SortableRowContext);

  return (
    <div
      ref={sortable?.setActivatorNodeRef}
      className="flex h-10 min-w-[104px] touch-none cursor-grab select-none items-center justify-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 text-primary shadow-sm transition-all group-hover:bg-primary/10 group-active:cursor-grabbing"
      title="Giữ và kéo dòng để đổi thứ tự phòng"
      {...sortable?.attributes}
      {...sortable?.listeners}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        className="h-5 w-5"
      >
        <path d="M8 6.75A1.75 1.75 0 1 1 4.5 6.75 1.75 1.75 0 0 1 8 6.75ZM8 12A1.75 1.75 0 1 1 4.5 12 1.75 1.75 0 0 1 8 12ZM6.25 19.25A1.75 1.75 0 1 0 6.25 15.75 1.75 1.75 0 0 0 6.25 19.25ZM15.75 8.5A1.75 1.75 0 1 0 15.75 5 1.75 1.75 0 0 0 15.75 8.5ZM17.5 12A1.75 1.75 0 1 1 14 12 1.75 1.75 0 0 1 17.5 12ZM15.75 19.25A1.75 1.75 0 1 0 15.75 15.75 1.75 1.75 0 0 0 15.75 19.25Z" />
      </svg>
    </div>
  );
}

function SortableRow({ row, isLoading }) {
  const productId = row.original.id;
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: productId,
    disabled: isLoading,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    position: "relative",
    zIndex: isDragging ? 20 : "auto",
  };
  const sortableValue = React.useMemo(
    () => ({
      attributes,
      listeners,
      setActivatorNodeRef,
    }),
    [attributes, listeners, setActivatorNodeRef]
  );

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`group transition-all duration-150 ${
        isDragging ? "scale-[1.01] bg-blue-50 opacity-90 shadow-xl" : "hover:bg-gray-50"
      }`}
    >
      <SortableRowContext.Provider value={sortableValue}>
        {row.getVisibleCells().map((cell) => (
          <td
            key={cell.id}
            className="min-w-[150px] border-white/0 py-3 pr-4 transition-all duration-150"
          >
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </td>
        ))}
      </SortableRowContext.Provider>
    </tr>
  );
}

export default function ComplexTable() {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = React.useState(false);
  const [data, setData] = useState([]);
  const [openConfirm, setOpenConfirm] = useState(false);
  const [id, setId] = React.useState(null);
  const router = useRouter();
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 180,
        tolerance: 8,
      },
    })
  );

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

  const saveProductOrder = async (nextData) => {
    setData(nextData);
    setIsLoading(true);

    try {
      const orders = nextData.map((item, index) => ({
        id: item.id,
        position: index + 1,
      }));

      await fetchData(`${URL_API}api/product/reorder`, "POST", { orders });
      showToastSuccess("Cập nhật thứ tự phòng thành công");
      queryClient.invalidateQueries({ queryKey: ["products"] });
    } catch (error) {
      if (error.response?.data?.message === "Invalid token") {
        handleInvalidToken(router);
      }
      showToastError("Cập nhật thứ tự phòng thất bại");
      fetchDataFromAPI();
    } finally {
      setIsLoading(false);
    }
  };

  const handleDragEnd = async ({ active, over }) => {
    if (!over || active.id === over.id) return;

    const currentIndex = data.findIndex((item) => item.id === active.id);
    const targetIndex = data.findIndex((item) => item.id === over.id);

    if (currentIndex < 0 || targetIndex < 0) return;

    await saveProductOrder(arrayMove(data, currentIndex, targetIndex));
  };

  const columns = [
    columnHelper.display({
      id: "drag",
      header: () => (
        <p className="text-sm font-bold text-gray-600 dark:text-white">Thứ tự</p>
      ),
      cell: (info) => {
        const productId = info.row.original.id;
        const index = data.findIndex((item) => item.id === productId);

        return (
          <div className="flex items-center gap-3">
            <span className="min-w-6 text-sm font-bold text-black">{index + 1}</span>
            <DragHandle />
          </div>
        );
      },
    }),
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
              className="h-[72px] w-[120px] rounded-lg bg-white object-contain"
              src={`${URL_API}${info.getValue().replace(/\\/g, "/")}`}
              alt="room"
            />
          ) : (
            <div className="flex h-[72px] w-[120px] items-center justify-center rounded-lg bg-gray-100 text-xs text-gray-400">No image</div>
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
            <div className="rounded-md border border-transparent bg-green-600 px-2.5 py-0.5 text-sm text-white shadow-sm transition-all">
              Còn trống
            </div>
          ) : (
            <div className="rounded-md border border-transparent bg-red-600 px-2.5 py-0.5 text-sm text-white shadow-sm transition-all">
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
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
                className="h-4 w-4"
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
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="2"
                stroke="currentColor"
                className="h-6 w-6 text-red-500"
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
    getCoreRowModel: getCoreRowModel(),
    debugTable: true,
  });

  return (
    <Card extra={"w-full h-full px-6 pb-6 sm:overflow-x-auto"}>
      {isLoading && <Loading />}
      <div className="mt-3 flex w-full items-center justify-between pl-3">
        <div>
          <button
            onClick={() => router.push("/admin/products/new")}
            className="w-full rounded-lg bg-green-600 px-5 py-2.5 text-center text-sm font-bold font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-4 focus:ring-primary-300 dark:bg-primary-600 dark:hover:bg-primary-700 dark:focus:ring-primary-800"
            suppressHydrationWarning={true}
          >
            Thêm phòng
          </button>
        </div>
      </div>
      {data.length ? (
        <div className="mt-8 overflow-x-scroll">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
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
                          className="border-b-[1px] border-primary pb-2 pr-4 pt-4 text-start"
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
              <SortableContext
                items={data.map((item) => item.id)}
                strategy={verticalListSortingStrategy}
              >
                <tbody>
                  {table
                    .getRowModel()
                    .rows
                    .map((row) => (
                      <SortableRow
                        key={row.original.id}
                        row={row}
                        isLoading={isLoading}
                      />
                    ))}
                </tbody>
              </SortableContext>
            </table>
          </DndContext>
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
