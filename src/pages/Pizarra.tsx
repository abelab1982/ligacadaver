import { TacticalBoard } from "@/components/pizarra/TacticalBoard";
import { Header } from "@/components/Header";

const Pizarra = () => {
  return (
    <div className="h-full bg-background flex flex-col overflow-hidden">
      <Header />
      <div className="flex-1 overflow-hidden">
        <TacticalBoard />
      </div>
    </div>
  );
};

export default Pizarra;
