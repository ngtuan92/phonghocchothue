"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { MdBarChart, MdDashboard, MdShoppingCart } from "react-icons/md";
import { useRouter } from "next/navigation";
import { handleInvalidToken } from "../../utils/helpers";
import { showToastError } from "../../helpers/toast";
import fetchData from "../../axios";
import Widget from "../../components/admin/widget/Widget";
import VisitChart from "../../components/admin/dashboard/visit-chart";

// eslint-disable-next-line no-undef
const URL_API = process.env.NEXT_PUBLIC_URL_API || "http://localhost:3000/";
const DASHBOARD_VISIT_LIMIT = 5000;

const Dashboard = () => {
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.title = "Admin | Dashboard";
    }
  }, []);

  const [data, setData] = useState({});
  const [dataChart, setDataChart] = useState([]);
  const isChartViewportLockedRef = useRef(false);
  const router = useRouter();

  const handleChartViewportChange = useCallback((isLocked) => {
    isChartViewportLockedRef.current = isLocked;
  }, []);

  const fetchRoomAPI = useCallback(async () => {
    try {
      const response = await fetchData(`${URL_API}api/dashboard`, "GET");
      // fetchData trả về response.data từ axios, nên response ở đây chính là data từ API
      // API có thể trả về { data: {...} } hoặc trực tiếp {...}
      if (response.data) {
        setData(response.data);
      } else {
        setData(response || {});
      }
    } catch (error) {
      if (error?.response?.data?.message === "Invalid token") {
        handleInvalidToken(router);
      }
      showToastError("Lấy dữ liệu dashboard thất bại");
      setData({});
    }
  }, [router]);

  const fetchVisitAPI = useCallback(async () => {
    try {
      const response = await fetchData(`${URL_API}api/list-visits?page=1&limit=${DASHBOARD_VISIT_LIMIT}`, "GET");

      // fetchData trả về response.data từ axios, nên response ở đây chính là data từ API
      // API có thể trả về { data: [...] } hoặc trực tiếp [...]
      let visitData = response.data || response;
      
      // Giữ nguyên timestamp để component biểu đồ tự xử lý múi giờ và sắp xếp.
      if (isChartViewportLockedRef.current) return;

      const nextVisitData = Array.isArray(visitData) ? visitData : [];
      setDataChart((currentVisitData) => {
        const isUnchanged =
          currentVisitData.length === nextVisitData.length &&
          currentVisitData.every((visit, index) => (
            visit?.id === nextVisitData[index]?.id &&
            visit?.visit_time === nextVisitData[index]?.visit_time
          ));

        return isUnchanged ? currentVisitData : nextVisitData;
      });
    } catch (error) {
      if (error?.response?.data?.message === "Invalid token") {
        handleInvalidToken(router);
      }
      showToastError("Lấy dữ liệu thống kê truy cập thất bại");
      setDataChart([]);
    }
  }, [router]);

  useEffect(() => {
    fetchRoomAPI();
    fetchVisitAPI();

    const intervalId = setInterval(() => {
      fetchRoomAPI();
      fetchVisitAPI();
    }, 30000);

    return () => clearInterval(intervalId);
  }, [fetchRoomAPI, fetchVisitAPI]);

  return (
    <div>
      <div className="mt-3 grid grid-cols-1 gap-5 md:grid-cols-3 lg:grid-cols-3 2xl:grid-cols-3 3xl:grid-cols-6">
        <Widget
          icon={<MdBarChart className="h-7 w-7" />}
          title={"Tổng số phòng"}
          subtitle={data.totalRoom || 0}
        />
        <Widget
          icon={<MdDashboard className="h-6 w-6" />}
          title={"Số lượng truy cập"}
          subtitle={data.totalAccess || 0}
        />
        <Widget
          icon={<MdShoppingCart className="h-7 w-7" />}
          title={"Tổng số đơn đã đặt phòng"}
          subtitle={data.totalOrder || 0}
        />
      </div>

      <div className="my-5 mt-4">
        {dataChart && dataChart.length > 0 ? (
          <VisitChart
            rawData={dataChart}
            title="Thống kê truy cập"
            onViewportChange={handleChartViewportChange}
          />
        ) : (
          <div className="w-full bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <p className="text-gray-500 text-center">
              {dataChart.length === 0 ? "Chưa có dữ liệu truy cập" : "Đang tải dữ liệu..."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;

