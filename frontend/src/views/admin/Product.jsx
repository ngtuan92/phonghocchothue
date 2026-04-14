import { useEffect } from "react";
import ComplexTable from "../../components/admin/product/ComplexTable";

function Product() {
  const columnsDataComplex = [
    {
      Header: "Tên phòng",
      accessor: "name",
    },
    {
      Header: "Ảnh",
      accessor: "image",
    },
    {
      Header: "Mô tả",
      accessor: "content",
    },
    {
      Header: "Tình trạng",
      accessor: "status",
    },
    {
      Header: "Action",
      accessor: "action",
    },
  ];

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.title = "Admin | Product";
    }
  }, []);

  return (
    <div>
      <div className="mt-5 grid h-full grid-cols-1 gap-5">
        <ComplexTable columnsData={columnsDataComplex} />
      </div>
    </div>
  );
}

export default Product;

