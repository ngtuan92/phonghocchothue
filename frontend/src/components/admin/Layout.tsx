"use client";

import React from "react";
import { usePathname } from "next/navigation";
import Navbar from "./navbar";
import Sidebar from "./sidebar";
import Footer from "./footer/Footer";
import routes from "@/routes";
import { Toaster } from "react-hot-toast";

function AdminScrollStabilizer() {
  const lastScrollRef = React.useRef<Array<{ element: Window | HTMLElement; top: number; left: number }>>([]);
  const activeAnchorRef = React.useRef<{
    element: HTMLElement;
    viewportTop: number;
    viewportLeft: number;
    parents: Array<Window | HTMLElement>;
  } | null>(null);
  const restoreFrameRef = React.useRef<number | null>(null);
  const userScrollTimerRef = React.useRef<number | null>(null);
  const userIsScrollingRef = React.useRef(false);
  const protectScrollUntilRef = React.useRef(0);
  const restoringScrollRef = React.useRef(false);

  React.useEffect(() => {
    const isEditableElement = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) return false;
      return Boolean(
        target.closest(
          'input, textarea, select, [contenteditable="true"], .ql-editor'
        )
      );
    };

    const collectScrollParents = (node: HTMLElement) => {
      const parents: Array<Window | HTMLElement> = [window];
      let current: HTMLElement | null = node.parentElement;

      while (current && current !== document.body) {
        const style = window.getComputedStyle(current);
        const canScrollY = /(auto|scroll|overlay)/.test(style.overflowY);
        const canScrollX = /(auto|scroll|overlay)/.test(style.overflowX);

        if (
          (canScrollY && current.scrollHeight > current.clientHeight) ||
          (canScrollX && current.scrollWidth > current.clientWidth)
        ) {
          parents.push(current);
        }

        current = current.parentElement;
      }

      return parents;
    };

    const rememberScroll = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement) || !isEditableElement(target)) return;

      const editableElement =
        target.closest<HTMLElement>(
          'input, textarea, select, [contenteditable="true"], .ql-editor'
        ) || target;
      const parents = collectScrollParents(editableElement);
      const rect = editableElement.getBoundingClientRect();

      activeAnchorRef.current = {
        element: editableElement,
        viewportTop: rect.top,
        viewportLeft: rect.left,
        parents,
      };

      lastScrollRef.current = parents.map((element) => {
        if (!(element instanceof HTMLElement)) {
          return {
            element,
            top: window.scrollY,
            left: window.scrollX,
          };
        }

        return {
          element,
          top: element.scrollTop,
          left: element.scrollLeft,
        };
      });
    };

    const restoreScroll = () => {
      if (userIsScrollingRef.current) return;

      restoringScrollRef.current = true;

      const anchor = activeAnchorRef.current;
      if (anchor && document.contains(anchor.element)) {
        const rect = anchor.element.getBoundingClientRect();
        const deltaTop = rect.top - anchor.viewportTop;
        const deltaLeft = rect.left - anchor.viewportLeft;
        const mainScrollParent = anchor.parents[anchor.parents.length - 1] || window;

        if (Math.abs(deltaTop) > 0.5 || Math.abs(deltaLeft) > 0.5) {
          if (mainScrollParent instanceof HTMLElement) {
            mainScrollParent.scrollTop += deltaTop;
            mainScrollParent.scrollLeft += deltaLeft;
          } else {
            window.scrollBy(deltaLeft, deltaTop);
          }
        }
      } else {
        lastScrollRef.current.forEach(({ element, top, left }) => {
          if (!(element instanceof HTMLElement)) {
            window.scrollTo(left, top);
          } else {
            element.scrollTop = top;
            element.scrollLeft = left;
          }
        });
      }

      window.requestAnimationFrame(() => {
        restoringScrollRef.current = false;
      });
    };

    const scheduleRestore = () => {
      if (restoreFrameRef.current !== null) {
        window.cancelAnimationFrame(restoreFrameRef.current);
      }

      restoreFrameRef.current = window.requestAnimationFrame(() => {
        restoreFrameRef.current = window.requestAnimationFrame(() => {
          restoreFrameRef.current = null;
          restoreScroll();
        });
      });
    };

    const protectAfterEditableFocus = (event: Event) => {
      rememberScroll(event.target);
      if (lastScrollRef.current.length === 0) return;
      protectScrollUntilRef.current = Date.now() + 250;
      scheduleRestore();
    };

    const protectBeforeSaveClick = (event: Event) => {
      const activeElement = document.activeElement;
      const target = event.target;
      const clickedSaveControl =
        target instanceof HTMLElement &&
        Boolean(target.closest('button, input[type="submit"], [role="button"]'));

      if (!clickedSaveControl || !isEditableElement(activeElement)) return;

      rememberScroll(activeElement);
      protectScrollUntilRef.current = Date.now() + 3000;
      if (restoreFrameRef.current !== null) {
        window.cancelAnimationFrame(restoreFrameRef.current);
      }
      scheduleRestore();
    };

    const markUserScroll = () => {
      userIsScrollingRef.current = true;
      protectScrollUntilRef.current = 0;
      activeAnchorRef.current = null;
      lastScrollRef.current = [];
      if (userScrollTimerRef.current !== null) {
        window.clearTimeout(userScrollTimerRef.current);
      }
      userScrollTimerRef.current = window.setTimeout(() => {
        userIsScrollingRef.current = false;
      }, 250);
    };

    const handleProgrammaticScroll = () => {
      if (
        restoringScrollRef.current ||
        userIsScrollingRef.current ||
        Date.now() > protectScrollUntilRef.current ||
        lastScrollRef.current.length === 0
      ) {
        return;
      }

      scheduleRestore();
    };

    const markKeyboardScroll = (event: KeyboardEvent) => {
      if (
        event.key === "PageDown" ||
        event.key === "PageUp" ||
        event.key === "Home" ||
        event.key === "End" ||
        event.key === "ArrowDown" ||
        event.key === "ArrowUp" ||
        event.key === " "
      ) {
        markUserScroll();
      }
    };

    const mutationObserver = new MutationObserver(() => {
      if (Date.now() <= protectScrollUntilRef.current) {
        scheduleRestore();
      }
    });

    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "style"],
    });

    document.addEventListener("focusin", protectAfterEditableFocus, true);
    document.addEventListener("pointerdown", protectBeforeSaveClick, true);
    document.addEventListener("scroll", handleProgrammaticScroll, true);
    document.addEventListener("keydown", markKeyboardScroll, true);
    window.addEventListener("wheel", markUserScroll, { passive: true });
    window.addEventListener("touchmove", markUserScroll, { passive: true });

    return () => {
      mutationObserver.disconnect();
      document.removeEventListener("focusin", protectAfterEditableFocus, true);
      document.removeEventListener("pointerdown", protectBeforeSaveClick, true);
      document.removeEventListener("scroll", handleProgrammaticScroll, true);
      document.removeEventListener("keydown", markKeyboardScroll, true);
      window.removeEventListener("wheel", markUserScroll);
      window.removeEventListener("touchmove", markUserScroll);
      if (restoreFrameRef.current !== null) {
        window.cancelAnimationFrame(restoreFrameRef.current);
      }
      if (userScrollTimerRef.current !== null) {
        window.clearTimeout(userScrollTimerRef.current);
      }
    };
  }, []);

  return null;
}

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

  const isEditPage = pathname?.includes("/blog/new") || 
                     pathname?.includes("/blog/edit/") || 
                     pathname?.includes("/products/new") || 
                     pathname?.includes("/products/edit/");
  
  return (
    <div className="flex h-full w-full">
      <Toaster />
      <AdminScrollStabilizer />
      <Sidebar open={isEditPage ? false : open} onClose={() => setOpen(false)} />

      <div className="h-full w-full bg-[#dee1e3]">
        <main className={`h-full flex-none transition-all ${isEditPage ? "" : "xl:ml-[313px]"}`}>
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
