import Card from "../card";

const Widget = ({ icon, title, subtitle }) => {
  return (
    <Card extra="!flex-row flex-grow items-center rounded-2xl border border-gray-200 bg-white p-5">
      <div className="ml-[18px] flex h-[90px] w-auto flex-row items-center">
        <div className="rounded-full p-3">
          <span className="flex items-center text-primary ">{icon}</span>
        </div>
      </div>

      <div className="h-50 ml-4 flex w-auto flex-col justify-center">
        <p className="font-dm text-sm font-medium text-primary">{title}</p>
        <h4 className="text-xl font-bold text-black ">{subtitle}</h4>
      </div>
    </Card>
  );
};

export default Widget;
