import { useState, useEffect } from "react";

export function useConfirmAlerts() {
  const [confirmCount, setConfirmCount] = useState<number>(2);

  const fetchConfig = async () => {
    try {
      const res = await fetch("/api/system-config");
      if (res.ok) {
        const data = await res.json();
        if (typeof data.confirmCount === "number" && data.confirmCount >= 1 && data.confirmCount <= 5) {
          setConfirmCount(data.confirmCount);
        } else {
          const stored = localStorage.getItem("traclytag_confirm_alerts_count");
          if (stored) {
            setConfirmCount(parseInt(stored, 10) || 2);
          }
        }
      } else {
        const stored = localStorage.getItem("traclytag_confirm_alerts_count");
        if (stored) {
          setConfirmCount(parseInt(stored, 10) || 2);
        }
      }
    } catch (err) {
      const stored = localStorage.getItem("traclytag_confirm_alerts_count");
      if (stored) {
        setConfirmCount(parseInt(stored, 10) || 2);
      }
    }
  };

  useEffect(() => {
    fetchConfig();

    const handleCustomChange = () => {
      fetchConfig();
    };

    window.addEventListener("traclytag_confirm_count_changed", handleCustomChange);

    return () => {
      window.removeEventListener("traclytag_confirm_count_changed", handleCustomChange);
    };
  }, []);

  const updateConfirmCount = async (count: number) => {
    try {
      localStorage.setItem("traclytag_confirm_alerts_count", String(count));
      setConfirmCount(count);
      window.dispatchEvent(new Event("traclytag_confirm_count_changed"));

      await fetch("/api/system-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmCount: count }),
      });
    } catch (err) {
      // ignore
    }
  };

  const confirmUnsavedChanges = (message?: string) => {
    return window.confirm(
      message || "You have unconfirmed changes in one or more sections! Are you sure you want to leave without saving?"
    );
  };

  return { confirmCount, updateConfirmCount, confirmUnsavedChanges };
}

export async function requestMultipleConfirmations(
  count: number,
  sectionName?: string
): Promise<boolean> {
  const name = sectionName ? `[${sectionName}] ` : "";
  for (let i = 1; i <= count; i++) {
    const message = `Confirmation ${i} of ${count}: Are you sure you want to save/confirm changes to ${name}this section?`;
    const confirmed = window.confirm(message);
    if (!confirmed) {
      return false;
    }
  }
  return true;
}

export function confirmUnsavedChanges(message?: string): boolean {
  return window.confirm(
    message || "You have unconfirmed changes in one or more sections! Are you sure you want to leave without saving?"
  );
}
