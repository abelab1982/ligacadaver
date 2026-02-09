import { formationKeys } from "./formations";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface FormationSelectorProps {
  value: string;
  onChange: (formation: string) => void;
}

export const FormationSelector = ({ value, onChange }: FormationSelectorProps) => {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[120px] h-8 text-xs bg-card border-border">
        <SelectValue placeholder="Formación" />
      </SelectTrigger>
      <SelectContent>
        {formationKeys.map((key) => (
          <SelectItem key={key} value={key} className="text-xs">
            {key}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
