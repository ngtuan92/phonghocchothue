"use client";

import React from "react";
import { usePathname } from "next/navigation";
import Navbar from "./navbar";
import Sidebar from "./sidebar";
import Footer from "./footer/Footer";
import routes from "@/routes";
import { Toaster } from "react-hot-toast";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(true);
  const [currentRoute, setCurrentRoute] = React.useState("Dashboard");

  React.useEffect(() => {
    const handleResize = () =>
      window.innerWidth < 1200 ? setOpen(false) : setOpen(true);

    if (typeof window !== "undefined") {
      handleResize();
      window.addEventListener("resize", handleResize);
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("resize", handleResize);
      }
    };
  }, []);

  React.useEffect(() => {
    getActiveRoute(routes);
  }, [pathname]);

  const getActiveRoute = (routes: any[]) => {
    let activeRoute = "Dashboard";
    for (let i = 0; i < routes.length; i++) {
      if (pathname?.includes(routes[i].layout + "/" + routes[i].path)) {
        setCurrentRoute(routes[i].name);
        activeRoute = routes[i].name;
      }
    }
    return activeRoute;
  };

  const getActiveNavbar = (routes: any[]) => {
    let activeNavbar = false;
    for (let i = 0; i < routes.length; i++) {
      if (pathname?.includes(routes[i].layout + routes[i].path)) {
        return routes[i].secondary;
      }
    }
    return activeNavbar;
  };

  React.useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.dir = "ltr";
    }
  }, []);
  
  return (
    <div className="flex h-full w-full">
      <Toaster />
      <Sidebar open={open} onClose={() => setOpen(false)} />

      <div className="h-full w-full bg-[#dee1e3]">
        <main className={`h-full flex-none transition-all xl:ml-[313px]`}>
          <div className="h-full">
            <Navbar
              onOpenSidenav={() => setOpen(true)}
              logoText={"Horizon UI Tailwind React"}
              brandText={currentRoute}
              secondary={getActiveNavbar(routes)}
            />
            <div className="pt-5s mx-auto mb-auto h-full min-h-[84vh] p-2 md:pr-2 bg-[#dee1e3]">
              {children}
            </div>
            <div className="p-3">
              <Footer />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
