import React from "react";

// Admin Imports
import Dashboard from "./views/admin/Dashboard";
import Product from "./views/admin/Product";
import Config from "./views/admin/Config";
import Order from "./views/admin/Order";
import Redirect from "./views/admin/Redirect";

// Icon Imports
import {
  MdDashboard,
  MdShoppingCart,
  MdSettings,
  MdHome,
  MdSwapHoriz,
} from "react-icons/md";

interface Route {
  name: string;
  layout: string;
  path: string;
  icon: React.ReactNode;
  component: React.ReactNode;
  secondary?: boolean;
}

const routes: Route[] = [
  {
    name: "Dashboard",
    layout: "/admin",
    path: "dashboard",
    icon: <MdDashboard className="h-6 w-6" />,
    component: <Dashboard />,
  },
  {
    name: "Phòng",
    layout: "/admin",
    path: "products",
    icon: <MdHome className="h-6 w-6" />,
    component: <Product />,
    secondary: true,
  },
  {
    name: "Đơn đặt",
    layout: "/admin",
    path: "order",
    icon: <MdShoppingCart className="h-6 w-6" />,
    component: <Order />,
    secondary: true,
  },
  {
    name: "Thiết định",
    layout: "/admin",
    path: "config",
    icon: <MdSettings className="h-6 w-6" />,
    component: <Config />,
    secondary: true,
  },
  {
    name: "Redirect URL",
    layout: "/admin",
    path: "redirect",
    icon: <MdSwapHoriz className="h-6 w-6" />,
    component: <Redirect />,
    secondary: true,
  },
];

export default routes;
