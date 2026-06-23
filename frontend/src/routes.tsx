import React from "react";

// Icon Imports
import {
  MdDashboard,
  MdShoppingCart,
  MdSettings,
  MdHome,
  MdSwapHoriz,
  MdArticle,
  MdPalette,
} from "react-icons/md";

interface Route {
  name: string;
  layout: string;
  path: string;
  icon: React.ReactNode;
  secondary?: boolean;
}

const routes: Route[] = [
  {
    name: "Dashboard",
    layout: "/admin",
    path: "dashboard",
    icon: <MdDashboard className="h-6 w-6" />,
  },
  {
    name: "Phòng",
    layout: "/admin",
    path: "products",
    icon: <MdHome className="h-6 w-6" />,
    secondary: true,
  },
  {
    name: "Blog",
    layout: "/admin",
    path: "blog",
    icon: <MdArticle className="h-6 w-6" />,
    secondary: true,
  },
  {
    name: "Đơn đặt",
    layout: "/admin",
    path: "order",
    icon: <MdShoppingCart className="h-6 w-6" />,
    secondary: true,
  },
  {
    name: "Thiết định",
    layout: "/admin",
    path: "config",
    icon: <MdSettings className="h-6 w-6" />,
    secondary: true,
  },
  {
    name: "Quản lý Giao diện",
    layout: "/admin",
    path: "cms",
    icon: <MdPalette className="h-6 w-6" />,
    secondary: true,
  },
  {
    name: "Redirect URL",
    layout: "/admin",
    path: "redirect",
    icon: <MdSwapHoriz className="h-6 w-6" />,
    secondary: true,
  },
];

export default routes;
