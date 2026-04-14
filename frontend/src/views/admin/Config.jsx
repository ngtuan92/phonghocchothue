import React, { useEffect } from "react";
import {
  Tabs,
  TabsHeader,
  TabsBody,
  Tab,
  TabPanel,
  Card,
  CardBody,
} from "@material-tailwind/react";

import Slider from "../../components/admin/slider";
import Other from "../../components/admin/other";

export default function Config() {
  const [activeTab, setActiveTab] = React.useState("slider");
  const data = [
    {
      label: "Slider",
      value: "slider",
      icon: "🖼️",
      desc: <Slider />,
    },
    {
      label: "Khác",
      value: "other",
      icon: "⚙️",
      desc: <Other />,
    },
  ];

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.title = "Admin | Config";
    }
  }, []);

  return (
    <div className="w-full max-w-6xl mx-auto p-6">
      
      <Card className="shadow-xl border border-gray-200 rounded-xl overflow-hidden">
        <CardBody className="p-0">
          <Tabs value={activeTab} className="w-full">
            <TabsHeader
              className="rounded-none border-b-2 border-gray-200 bg-white p-0 shadow-sm"
              indicatorProps={{
                className:
                  "bg-[#15803d] h-1 bottom-0 rounded-t-lg transition-all duration-300",
              }}
            >
              {data.map(({ label, value, icon }) => (
                <Tab
                  key={value}
                  value={value}
                  onClick={() => setActiveTab(value)}
                  className={`relative px-8 py-4 font-semibold text-sm transition-all duration-300 ease-in-out ${
                    activeTab === value
                      ? "text-[#15803d] bg-green-50/50"
                      : "text-gray-600 hover:text-[#15803d] hover:bg-green-50/30"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{icon}</span>
                    <span>{label}</span>
                  </div>
                  {activeTab === value && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#15803d] rounded-t-full" />
                  )}
                </Tab>
              ))}
            </TabsHeader>

            <TabsBody
              className="min-h-[500px] bg-gray-50/30"
              animate={{
                initial: { y: 20, opacity: 0 },
                mount: { y: 0, opacity: 1 },
                unmount: { y: 20, opacity: 0 },
              }}
            >
              {data.map(({ value, desc }) => (
                <TabPanel key={value} value={value} className="p-8">
                  <div className="animate-fade-in bg-white rounded-lg shadow-sm p-6 border border-gray-100">
                    {desc}
                  </div>
                </TabPanel>
              ))}
            </TabsBody>
          </Tabs>
        </CardBody>
      </Card>
    </div>
  );
}

