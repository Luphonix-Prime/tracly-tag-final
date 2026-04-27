import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

export interface DateRange {
  from?: string;
  to?: string;
}

interface DateRangeFilterProps {
  value: DateRange;
  onChange: (next: DateRange) => void;
}

export function DateRangeFilter({ value, onChange }: DateRangeFilterProps) {
  const hasValue = Boolean(value.from || value.to);
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">Date Range:</span>
      <Input
        type="date"
        className="w-[160px]"
        value={value.from ?? ""}
        onChange={(e) => onChange({ ...value, from: e.target.value || undefined })}
      />
      <span className="text-muted-foreground">→</span>
      <Input
        type="date"
        className="w-[160px]"
        value={value.to ?? ""}
        onChange={(e) => onChange({ ...value, to: e.target.value || undefined })}
      />
      {hasValue && (
        <Button variant="ghost" size="icon" onClick={() => onChange({})} title="Clear date range">
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
