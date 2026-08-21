"use client"

import { useState, useMemo, useCallback, useRef } from "react"
import dynamic from "next/dynamic"
import PropTypes from "prop-types"

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false })
const VISIT_CHART_ID = "dashboard-visit-chart"
const DEFAULT_DAY_WINDOW = 10
const DEFAULT_MONTH_WINDOW = 12
const DEFAULT_YEAR_WINDOW = 5

// Sample data mặc định
const defaultVisitData = [
  { id: 1, ip_address: "192.168.1.1", user_agent: "Chrome", visit_time: "2024-01-01" },
  { id: 2, ip_address: "192.168.1.2", user_agent: "Firefox", visit_time: "2024-01-01" },
  { id: 3, ip_address: "192.168.1.3", user_agent: "Safari", visit_time: "2024-01-02" },
  { id: 4, ip_address: "192.168.1.4", user_agent: "Chrome", visit_time: "2024-01-02" },
  { id: 5, ip_address: "192.168.1.5", user_agent: "Edge", visit_time: "2024-01-03" },
]

const REPORT_TIME_ZONE = "Asia/Ho_Chi_Minh"
const datePartsFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: REPORT_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
})

const getDateParts = (value) => {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return null

  const parts = Object.fromEntries(
    datePartsFormatter
      .formatToParts(date)
      .filter(({ type }) => type !== "literal")
      .map(({ type, value: partValue }) => [type, Number(partValue)]),
  )

  return {
    year: parts.year,
    month: parts.month,
    day: parts.day,
  }
}

const padNumber = (value) => String(value).padStart(2, "0")
const getDayKey = ({ year, month, day }) =>
  `${year}-${padNumber(month)}-${padNumber(day)}`

const getCurrentWeekDates = () => {
  const currentParts = getDateParts(new Date())
  if (!currentParts) return []

  const currentDate = new Date(
    Date.UTC(currentParts.year, currentParts.month - 1, currentParts.day),
  )
  const dayOfWeek = currentDate.getUTCDay()
  const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  const startOfWeek = new Date(currentDate)
  startOfWeek.setUTCDate(currentDate.getUTCDate() - mondayOffset)

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(startOfWeek)
    date.setUTCDate(startOfWeek.getUTCDate() + index)

    const parts = {
      year: date.getUTCFullYear(),
      month: date.getUTCMonth() + 1,
      day: date.getUTCDate(),
    }

    return {
      key: getDayKey(parts),
      label: `${index === 6 ? "CN" : `T${index + 2}`} ${padNumber(parts.day)}-${padNumber(parts.month)}`,
    }
  })
}

const processVisitData = (data, period) => {
  if (!Array.isArray(data) || data.length === 0) {
    return { categories: [], data: [] }
  }

  const normalizedDates = data
    .map((visit) => getDateParts(visit.visit_time))
    .filter(Boolean)

  if (normalizedDates.length === 0) {
    return { categories: [], data: [] }
  }

  if (period === "currentWeek") {
    const dailyCounts = normalizedDates.reduce((counts, parts) => {
      const key = getDayKey(parts)
      counts.set(key, (counts.get(key) || 0) + 1)
      return counts
    }, new Map())
    const weekDates = getCurrentWeekDates()

    return {
      categories: weekDates.map(({ label }) => label),
      data: weekDates.map(({ key }) => dailyCounts.get(key) || 0),
    }
  }

  const buckets = new Map()

  normalizedDates.forEach((parts) => {
    let key
    let label
    let sortValue

    if (period === "year") {
      key = String(parts.year)
      label = key
      sortValue = parts.year
    } else if (period === "month") {
      key = `${parts.year}-${padNumber(parts.month)}`
      label = `${padNumber(parts.month)}-${parts.year}`
      sortValue = Date.UTC(parts.year, parts.month - 1, 1)
    } else {
      key = getDayKey(parts)
      label = `${padNumber(parts.day)}-${padNumber(parts.month)}`
      sortValue = Date.UTC(parts.year, parts.month - 1, parts.day)
    }

    const bucket = buckets.get(key)
    if (bucket) {
      bucket.count += 1
    } else {
      buckets.set(key, { label, sortValue, count: 1 })
    }
  })

  const currentParts = getDateParts(new Date()) || { year: 2026, month: 8, day: 21 }

  let minYear = currentParts.year
  let minMonthDate = new Date(Date.UTC(currentParts.year, currentParts.month - 1 - 35, 1))
  let minDayDate = new Date(Date.UTC(currentParts.year, currentParts.month - 1, currentParts.day - 89))

  normalizedDates.forEach((parts) => {
    if (parts.year < minYear) {
      minYear = parts.year
    }
    const mDate = new Date(Date.UTC(parts.year, parts.month - 1, 1))
    if (mDate < minMonthDate) {
      minMonthDate = mDate
    }
    const dDate = new Date(Date.UTC(parts.year, parts.month - 1, parts.day))
    if (dDate < minDayDate) {
      minDayDate = dDate
    }
  })

  if (period === "day") {
    const currentDate = new Date(
      Date.UTC(currentParts.year, currentParts.month - 1, currentParts.day),
    )
    let iterDate = new Date(minDayDate)
    while (iterDate <= currentDate) {
      const parts = {
        year: iterDate.getUTCFullYear(),
        month: iterDate.getUTCMonth() + 1,
        day: iterDate.getUTCDate(),
      }
      const key = getDayKey(parts)
      if (!buckets.has(key)) {
        buckets.set(key, {
          label: `${padNumber(parts.day)}-${padNumber(parts.month)}`,
          sortValue: iterDate.getTime(),
          count: 0,
        })
      }
      iterDate.setUTCDate(iterDate.getUTCDate() + 1)
    }
  } else if (period === "month") {
    const currentMonthDate = new Date(
      Date.UTC(currentParts.year, currentParts.month - 1, 1),
    )
    let iterDate = new Date(minMonthDate)
    while (iterDate <= currentMonthDate) {
      const parts = {
        year: iterDate.getUTCFullYear(),
        month: iterDate.getUTCMonth() + 1,
      }
      const key = `${parts.year}-${padNumber(parts.month)}`
      if (!buckets.has(key)) {
        buckets.set(key, {
          label: `${padNumber(parts.month)}-${parts.year}`,
          sortValue: iterDate.getTime(),
          count: 0,
        })
      }
      iterDate.setUTCMonth(iterDate.getUTCMonth() + 1)
    }
  } else if (period === "year") {
    const startYear = Math.min(minYear, currentParts.year - 9)
    for (let y = startYear; y <= currentParts.year; y += 1) {
      const key = String(y)
      if (!buckets.has(key)) {
        buckets.set(key, {
          label: key,
          sortValue: y,
          count: 0,
        })
      }
    }
  }

  const sortedBuckets = Array.from(buckets.values()).sort(
    (a, b) => a.sortValue - b.sortValue,
  )

  return {
    categories: sortedBuckets.map(({ label }) => label),
    data: sortedBuckets.map(({ count }) => count),
  }
}

const VisitChart = ({
  rawData = defaultVisitData,
  title = "Thống kê lượt truy cập",
  color = "#3B82F6",
  height = 400,
  onViewportChange,
}) => {
  const [timePeriod, setTimePeriod] = useState("currentWeek")
  const ignoreNextZoomEventRef = useRef(false)
  const shouldApplyDefaultDayWindowRef = useRef(false)

  const handleTimePeriodChange = useCallback((event) => {
    const nextPeriod = event.target.value
    onViewportChange?.(false)
    shouldApplyDefaultDayWindowRef.current = true
    setTimePeriod(nextPeriod)
  }, [onViewportChange])

  const handleChartZoom = useCallback(() => {
    if (ignoreNextZoomEventRef.current) {
      ignoreNextZoomEventRef.current = false
      return
    }
    shouldApplyDefaultDayWindowRef.current = false
    onViewportChange?.(true)
  }, [onViewportChange])

  const handleChartReset = useCallback(() => {
    ignoreNextZoomEventRef.current = true
    shouldApplyDefaultDayWindowRef.current = false
    onViewportChange?.(false)
  }, [onViewportChange])

  // Xử lý dữ liệu dựa trên time period được chọn
  const chartData = useMemo(() => {
    return processVisitData(rawData, timePeriod)
  }, [rawData, timePeriod])

  const applyDefaultDayWindow = useCallback((chartContext) => {
    let windowSize = 0
    if (timePeriod === "day") windowSize = DEFAULT_DAY_WINDOW
    else if (timePeriod === "month") windowSize = DEFAULT_MONTH_WINDOW
    else if (timePeriod === "year") windowSize = DEFAULT_YEAR_WINDOW

    if (
      !shouldApplyDefaultDayWindowRef.current ||
      windowSize === 0 ||
      chartData.categories.length <= windowSize
    ) {
      return
    }

    const lastPoint = chartData.categories.length
    const firstPoint = Math.max(1, lastPoint - windowSize + 1)
    const currentMin = chartContext?.w?.globals?.minX
    const currentMax = chartContext?.w?.globals?.maxX

    if (currentMin === firstPoint && currentMax === lastPoint) return

    ignoreNextZoomEventRef.current = true
    window.requestAnimationFrame(() => {
      try {
        chartContext?.zoomX?.(firstPoint, lastPoint)
      } catch (error) {
        ignoreNextZoomEventRef.current = false
        console.error("Unable to apply the default visit chart window", error)
      }
    })
  }, [chartData.categories.length, timePeriod])

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
        id: VISIT_CHART_ID,
        type: "line",
        events: {
          mounted: applyDefaultDayWindow,
          updated: applyDefaultDayWindow,
          zoomed: handleChartZoom,
          scrolled: handleChartZoom,
          beforeResetZoom: handleChartReset,
        },
        toolbar: {
          show: true,
          autoSelected: "zoom",
          tools: {
            download: false,
            selection: true,
            zoom: true,
            zoomin: true,
            zoomout: true,
            pan: true,
            reset: true,
          },
        },
        zoom: {
          enabled: true,
          type: "x",
          autoScaleYaxis: true,
          allowMouseWheelZoom: true,
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
        tickPlacement: timePeriod === "day" ? "on" : "between",
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
    [applyDefaultDayWindow, chartData, title, timePeriod, color, handleChartReset, handleChartZoom],
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
            onChange={handleTimePeriodChange}
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
      <Chart
        key={timePeriod}
        options={chartOptions}
        series={series}
        type="line"
        height={height}
      />
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
  onViewportChange: PropTypes.func,
}

export default VisitChart
