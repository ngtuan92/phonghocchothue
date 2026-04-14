"use client"

import { useState, useMemo } from "react"
import dynamic from "next/dynamic"
import PropTypes from "prop-types"

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false })

// Sample data mặc định
const defaultVisitData = [
  { id: 1, ip_address: "192.168.1.1", user_agent: "Chrome", visit_time: "2024-01-01" },
  { id: 2, ip_address: "192.168.1.2", user_agent: "Firefox", visit_time: "2024-01-01" },
  { id: 3, ip_address: "192.168.1.3", user_agent: "Safari", visit_time: "2024-01-02" },
  { id: 4, ip_address: "192.168.1.4", user_agent: "Chrome", visit_time: "2024-01-02" },
  { id: 5, ip_address: "192.168.1.5", user_agent: "Edge", visit_time: "2024-01-03" },
]

const VisitChart = ({
  rawData = defaultVisitData,
  title = "Thống kê lượt truy cập",
  color = "#3B82F6",
  height = 400,
}) => {
  const [timePeriod, setTimePeriod] = useState("currentWeek")

  const getCurrentWeekDates = () => {
    const now = new Date()
    const dayOfWeek = now.getDay()
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)) // Monday as start

    const weekDates = []
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek)
      date.setDate(startOfWeek.getDate() + i)
      weekDates.push(date.toISOString().split("T")[0])
    }
    return weekDates
  }

  // Hàm xử lý dữ liệu thô thành format cho chart
  const processVisitData = (data, period) => {
    // Validate và normalize data
    if (!Array.isArray(data) || data.length === 0) {
      console.warn("VisitChart: Invalid or empty data", data);
      return {
        categories: [],
        data: [],
      };
    }

    // Normalize visit_time format
    const normalizedData = data.map((visit) => {
      if (!visit.visit_time) {
        console.warn("Visit missing visit_time:", visit);
        return null;
      }
      
      let dateStr = visit.visit_time;
      // Nếu là string, normalize format
      if (typeof dateStr === "string") {
        // Lấy phần date nếu có time
        dateStr = dateStr.split("T")[0].split(" ")[0];
      }
      
      // Validate date
      const date = new Date(dateStr);
      if (Number.isNaN(date.getTime())) {
        console.warn("Invalid date format:", visit.visit_time);
        return null;
      }
      
      return {
        ...visit,
        visit_time: dateStr,
      };
    }).filter(Boolean); // Loại bỏ null values

    if (normalizedData.length === 0) {
      console.warn("VisitChart: No valid data after normalization");
      return {
        categories: [],
        data: [],
      };
    }

    if (period === "currentWeek") {
      const currentWeekDates = getCurrentWeekDates()
      const weekData = currentWeekDates.map((date) => {
        const count = normalizedData.filter((visit) => {
          const visitDate = visit.visit_time.split("T")[0].split(" ")[0];
          return visitDate === date;
        }).length
        const dayName = new Date(date).toLocaleDateString("vi-VN", { weekday: "short" })
        return { date: dayName, count }
      })

      return {
        categories: weekData.map((item) => item.date),
        data: weekData.map((item) => item.count),
      }
    }

    const visitCounts = {}

    normalizedData.forEach((visit) => {
      const date = new Date(visit.visit_time)
      if (Number.isNaN(date.getTime())) {
        return; // Skip invalid dates
      }
      let key

      switch (period) {
        case "day":
          key = date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })
          break
        case "month":
          key = date.toLocaleDateString("vi-VN", { month: "2-digit", year: "numeric" })
          break
        case "year":
          key = date.getFullYear().toString()
          break
        default:
          key = date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })
      }

      visitCounts[key] = (visitCounts[key] || 0) + 1
    })

    // Sắp xếp theo thời gian
    const sortedEntries = Object.entries(visitCounts).sort((a, b) => {
      if (period === "year") {
        return Number.parseInt(a[0]) - Number.parseInt(b[0])
      }
      // Cho day và month, chuyển đổi về Date để so sánh
      const dateA =
        period === "day"
          ? new Date(`2024-${a[0].split("/").reverse().join("-")}`)
          : new Date(`${a[0].split("/").reverse().join("-")}-01`)
      const dateB =
        period === "day"
          ? new Date(`2024-${b[0].split("/").reverse().join("-")}`)
          : new Date(`${b[0].split("/").reverse().join("-")}-01`)
      return dateA - dateB
    })

    return {
      categories: sortedEntries.map(([key]) => key),
      data: sortedEntries.map(([, count]) => count),
    }
  }

  // Xử lý dữ liệu dựa trên time period được chọn
  const chartData = useMemo(() => {
    console.log("VisitChart processing data:", rawData);
    const processed = processVisitData(rawData, timePeriod);
    console.log("VisitChart processed data:", processed);
    return processed;
  }, [rawData, timePeriod, processVisitData])

  const totalVisits = useMemo(() => {
    if (!chartData.data || chartData.data.length === 0) {
      return 0;
    }
    return chartData.data.reduce((sum, count) => sum + count, 0)
  }, [chartData.data])

  // Cấu hình chart
  const chartOptions = useMemo(
    () => ({
      chart: {
        type: "line",
        toolbar: {
          show: true,
          tools: {
            download: false,
            selection: false,
            zoom: true,
            zoomin: true,
            zoomout: true,
            pan: false,
            reset: true,
          },
        },
        background: "transparent",
      },
      title: {
        text: `${title} - Theo ${
          timePeriod === "day"
            ? "ngày"
            : timePeriod === "month"
              ? "tháng"
              : timePeriod === "year"
                ? "năm"
                : timePeriod === "currentWeek"
                  ? "tuần hiện tại"
                  : "ngày"
        }`,
        align: "left",
        style: {
          fontSize: "18px",
          fontWeight: "600",
          color: "#1f2937",
        },
      },
      xaxis: {
        categories: chartData.categories,
        title: {
          text:
            timePeriod === "day"
              ? "Ngày"
              : timePeriod === "month"
                ? "Tháng"
                : timePeriod === "year"
                  ? "Năm"
                  : timePeriod === "currentWeek"
                    ? "Thứ"
                    : "Ngày",
          style: {
            color: "#6b7280",
            fontSize: "14px",
          },
        },
        labels: {
          style: {
            colors: "#6b7280",
          },
        },
      },
      yaxis: {
        title: {
          text: "Số lượt truy cập",
          style: {
            color: "#6b7280",
            fontSize: "14px",
          },
        },
        labels: {
          style: {
            colors: "#6b7280",
          },
        },
      },
      stroke: {
        curve: "smooth",
        width: 3,
      },
      colors: [color],
      markers: {
        size: 6,
        colors: [color],
        strokeColors: "#fff",
        strokeWidth: 2,
        hover: {
          size: 8,
        },
      },
      grid: {
        borderColor: "#e5e7eb",
        strokeDashArray: 3,
      },
      tooltip: {
        theme: "light",
        y: {
          formatter: (value) => `${value} lượt truy cập`,
        },
      },
    }),
    [chartData, title, timePeriod, color],
  )

  const series = useMemo(
    () => [
      {
        name: "Lượt truy cập",
        data: chartData.data,
      },
    ],
    [chartData.data],
  )

  return (
    <div className="w-full bg-white p-6 rounded-lg shadow-sm border border-gray-200">
    <div className="space-y-2 mb-4">
              <h1 className="text-3xl font-bold">Thống Kê</h1>
              <p className="text-muted-foreground">Theo dõi lượt truy cập website của bạn</p>
            </div>
      {/* Select dropdown cho time period */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <label htmlFor="timePeriod" className="block text-sm font-medium text-gray-700 mb-2">
            Hiển thị theo:
          </label>
          <select
            id="timePeriod"
            value={timePeriod}
            onChange={(e) => setTimePeriod(e.target.value)}
            className="block w-48 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
          >
            <option value="currentWeek">Tuần hiện tại</option>
            <option value="day">Ngày</option>
            <option value="month">Tháng</option>
            <option value="year">Năm</option>
          </select>
        </div>

        <div className="text-right">
          <div className="text-sm text-black mb-1">Tổng lượt truy cập</div>
          <div className="text-2xl font-bold text-primary">{totalVisits.toLocaleString()}</div>
          <div className="text-xs text-primary">
            {timePeriod === "day"
              ? "theo ngày"
              : timePeriod === "month"
                ? "theo tháng"
                : timePeriod === "year"
                  ? "theo năm"
                  : timePeriod === "currentWeek"
                    ? "tuần hiện tại"
                    : "theo ngày"}
          </div>
        </div>
      </div>

      {/* Chart */}
      <Chart options={chartOptions} series={series} type="line" height={height} />
    </div>
  )
}

VisitChart.propTypes = {
  rawData: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      ip_address: PropTypes.string,
      user_agent: PropTypes.string,
      visit_time: PropTypes.string,
    })
  ),
  title: PropTypes.string,
  color: PropTypes.string,
  height: PropTypes.number,
}

export default VisitChart
