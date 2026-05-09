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
          <div className="w-full h-36 sm:h-44 overflow-hidden">
            <img
              className="w-full h-36 sm:h-44 object-cover my-2 sm:my-4 cursor-pointer duration-500 hover:scale-110  flex justify-center items-center"
              src={`${URL_API}${product.image.replaceAll("\\", "/")}`}
              alt={product.name}
            />
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

