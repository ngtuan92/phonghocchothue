import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Dropdown from "../dropdown";
import { FiAlignJustify } from "react-icons/fi";
import avatar from "../../../assets/img/avatars/avatar4.png";
import { handleInvalidToken } from "../../../utils/helpers"

const Navbar = (props) => {
  const { onOpenSidenav, brandText } = props;
  const router = useRouter();

  const logout = () => {

    handleInvalidToken(router)
  }

  return (
    <nav className="sticky top-0 z-40 flex flex-row flex-wrap items-center justify-between bg-primary p-2 backdrop-blur-xl">
      <div className="ml-[6px]">
        <div className="h-6 w-[224px] pt-1">
          <Link
            className="text-sm font-normal hover:underline text-white dark:hover:text-white"
            href="/admin/dashboard"
          >
            Dashboard
            <span className="mx-1 text-sm text-white">
              {" "}
              /{" "}
            </span>
          </Link>
          <Link
            className="text-sm font-normal capitalize hover:underline text-white hover:text-white"
            href="#"
          >
            {brandText}
          </Link>
        </div>
        <p className="shrink text-[33px] capitalize text-white">
          <Link
            href="#"
            className="font-bold capitalize hover:text-white"
          >
            {brandText}
          </Link>
        </p>
      </div>

      <div className="relative mt-[3px] flex h-[61px] w-[100px] flex-grow items-center justify-around gap-2 rounded-full bg-white px-2 py-2 shadow-xl shadow-shadow-500 dark:!bg-navy-800 dark:shadow-none md:w-[100px] md:flex-grow-0 md:gap-1 xl:w-[61px] xl:gap-2 sm:w-[100px]">
        
        <span
          className="flex cursor-pointer text-xl text-primary xl:hidden"
          onClick={onOpenSidenav}
        >
          <FiAlignJustify className="h-5 w-5" />
        </span>

        {/* Profile & Dropdown */}
        <Dropdown
          button={
            <img
              className="h-10 w-10 rounded-full"
              src={avatar}
              alt="ADMIN"
            />
          }
          children={
            <div className="flex w-56 flex-col justify-start rounded-[20px] bg-white bg-cover bg-no-repeat shadow-xl shadow-shadow-500 dark:!bg-navy-700 text-black dark:shadow-none">
              <div className="p-4">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-black">
                    Admin
                  </p>{" "}
                </div>
              </div>
              <div className="h-px w-full bg-gray-200 dark:bg-white/20 " />

              <div className="flex flex-col p-4">
                <a
                href=""
                  onClick={logout}
                  className="mt-3 text-sm font-medium text-red-500 hover:text-red-500 transition duration-150 ease-out hover:ease-in"
                >
                  Log Out
                </a>
              </div>
            </div>
          }
          classNames={"py-2 top-8 -left-[180px] w-max"}
        />
      </div>
    </nav>
  );
};

export default Navbar;
