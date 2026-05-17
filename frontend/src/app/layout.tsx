// app/layout.tsx
import type { Metadata } from "next";
import "@mantine/core/styles.css";
import { Providers } from "@/lib/query-client";
import { ConfigProvider } from "@/context/ConfigProvider";
import { Toaster } from "react-hot-toast";
import "../index.css";
import "../App.css";
import "react-slideshow-image/dist/styles.css";
import MantineProviderWrapper from "./MantineProviderWrapper";
import GoogleVerificationMeta from "@/components/GoogleVerificationMeta";
import DynamicFonts from "@/components/DynamicFonts";
import CustomFontProvider from "@/components/CustomFontProvider";

export const metadata: Metadata = {
  metadataBase: new URL("https://phonghocchothue.com"),
  title: {
    default: "Cho thuê phòng dạy học tại Đà Nẵng | Phòng học đầy đủ tiện nghi.",
    template: "%s | Cho thuê phòng dạy học tại Đà Nẵng.",
  },
  description: "Cho thuê phòng dạy học theo giờ, buổi, dài hạn tại Đà Nẵng. Phòng học sạch sẽ, wifi mạnh, máy chiếu, bàn ghế tiêu chuẩn. Liên hệ đặt phòng nhanh chóng.",
  icons: {
    icon: "/favicon.png",
  },
  openGraph: {
    type: "website",
    url: "https://phonghocchothue.com",
    title: "Cho thuê phòng dạy học tại Đà Nẵng | Phòng học đầy đủ tiện nghi.",
    description: "Cho thuê phòng dạy học theo giờ, buổi, dài hạn tại Đà Nẵng. Phòng học sạch sẽ, wifi mạnh, máy chiếu, bàn ghế tiêu chuẩn. Liên hệ đặt phòng nhanh chóng.",
    siteName: "PhongHocChoThue",
  },
  twitter: {
    card: "summary_large_image",
    title: "Cho thuê phòng dạy học tại Đà Nẵng | Phòng học đầy đủ tiện nghi.",
    description: "Cho thuê phòng dạy học theo giờ, buổi, dài hạn tại Đà Nẵng. Phòng học sạch sẽ, wifi mạnh, máy chiếu, bàn ghế tiêu chuẩn. Liên hệ đặt phòng nhanh chóng.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Alex+Brush&family=Amatic+SC:wght@400;700&family=Bebas+Neue&family=Caveat:wght@400..700&family=Dancing+Script:wght@400..700&family=Great+Vibes&family=Inter:wght@400..700&family=Lato:ital,wght@0,400;0,700;1,400;1,700&family=Montserrat:ital,wght@0,400..900;1,400..900&family=Nunito:ital,wght@0,400..900;1,400..900&family=Oswald:wght@400..700&family=Pacifico&family=Parisienne&family=Pinyon+Script&family=Playfair+Display:ital,wght@0,400..900;1,400..900&family=Poppins:ital,wght@0,400;0,700;1,400;1,700&family=Quicksand:wght@400..700&family=Raleway:ital,wght@0,400..900;1,400..900&family=Roboto:ital,wght@0,400;0,700;1,400;1,700&family=Satisfy&family=Syncopate:wght@400;700&family=Tangerine:wght@400;700&display=swap" rel="stylesheet" />
        <DynamicFonts />
        <CustomFontProvider />
      </head>
      <body suppressHydrationWarning>
        <Providers>
          <MantineProviderWrapper>
            <ConfigProvider>
              <GoogleVerificationMeta />
              {children}
              <Toaster />
            </ConfigProvider>
          </MantineProviderWrapper>
        </Providers>
      </body>
    </html>
  );
}
