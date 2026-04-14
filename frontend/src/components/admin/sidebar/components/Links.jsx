/* eslint-disable */
import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import DashIcon from "../../icons/DashIcon";
// chakra imports

export function SidebarLinks(props) {
  const pathname = usePathname();
  const { routes } = props;

  const activeRoute = (routeName) => {
    if (!pathname) return false;
    return pathname.includes(routeName);
  };

  const createLinks = (routes) => {
    return routes.map((route, index) => {
      if (
        route.layout === "/admin" ||
        route.layout === "/login"
      ) {
        return (
          <Link key={index} href={`${route.layout}/${route.path}`}>
            <div className="relative mb-3 flex hover:cursor-pointer">
              <li
                className="my-[3px] flex cursor-pointer items-center px-8"
                key={index}
              >
                <span
                  className={`${
                    activeRoute(route.path) === true
                      ? "font-bold text-primary"
                      : "font-medium text-black"
                  }`}
                >
                  {route.icon ? route.icon : <DashIcon />}{" "}
                </span>
                <p
                  className={`leading-1 ml-4 flex ${
                    activeRoute(route.path) === true
                      ? "font-bold text-primary"
                      : "font-medium text-black"
                  }`}
                >
                  {route.name}
                </p>
              </li>
              {activeRoute(route.path) ? (
                <div className="absolute right-0 top-px h-9 w-1 rounded-lg bg-brand-500" />
              ) : null}
            </div>
          </Link>
        );
      }
    });
  };
  // BRAND
  return createLinks(routes);
}

export default SidebarLinks;
