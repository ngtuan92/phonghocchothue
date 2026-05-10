"use client";

import { useRouter } from "next/navigation";
import { useProducts } from "@/hooks/api/useProducts";
import { getProductUrl } from "@/utils/productUrl";

const URL_API = process.env.NEXT_PUBLIC_URL_API || "http://localhost:3000/";

interface Product {
  id?: string | number;
  _id?: string | number;
  slug?: string;
  name: string;
  image: string;
  equipment?: string;
  contains?: string;
}

const Rooms = () => {
  const router = useRouter();
  const { data: products = [] } = useProducts();

  const handleDetailProduct = (product: Product) => () => {
    router.push(getProductUrl(product));
  };

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 ">
      {products.map((product: Product) => (
        <div
          key={product.id || product._id}
          className="p-2 sm:p-6 text-center overflow-hidden cursor-pointer"
          onClick={handleDetailProduct(product)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              handleDetailProduct(product)();
            }
          }}
        >
          <div className="w-full h-36 sm:h-44 overflow-hidden relative group">
            <img
              className="w-full h-36 sm:h-44 object-cover my-2 sm:my-4 cursor-pointer duration-500 group-hover:scale-110 flex justify-center items-center"
              src={`${URL_API}${product.image.replaceAll("\\", "/")}`}
              alt={product.name}
            />
            <div className="absolute inset-0 bg-gray-950 bg-opacity-70 flex-col items-start px-4 py-2 text-white transform translate-y-full group-hover:translate-y-0 transition-transform duration-500 hidden lg:flex text-left">
              <h2 className="text-lg font-bold uppercase">{product.name}</h2>
              <ul className="list-disc ml-5 text-base mt-2 space-y-1">
                {product.equipment && <li>{product.equipment}</li>}
                {product.contains && <li>{product.contains}</li>}
              </ul>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDetailProduct(product)();
                }}
                className="my-4 w-auto bg-[#b8c7b0] px-[15px] sm:px-[20px] text-white rounded-tl-xl rounded-br-xl py-[5px] hover:bg-[#e57f7f]"
              >
                Xem thêm
              </button>
            </div>
          </div>
          <div className="text-base sm:text-lg  text-center font-sans font-bold text-black">
            {product.name}
          </div>
        </div>
      ))}
    </div>
  );
};

export default Rooms;

