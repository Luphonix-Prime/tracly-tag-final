import { useState, useEffect } from "react";

export function usePackagingLevelVisibility() {
  const [hidePackagingLevel, setHidePackagingLevel] = useState(true);

  const fetchConfig = async () => {
    try {
      const res = await fetch("/api/system-config");
      if (res.ok) {
        const data = await res.json();
        setHidePackagingLevel(data.hidePackagingLevel !== false);
      }
    } catch (err) {
      // ignore
    }
  };

  useEffect(() => {
    fetchConfig();

    const handleCustomChange = () => {
      fetchConfig();
    };

    window.addEventListener("traclytag_packaging_level_visibility_changed", handleCustomChange);

    return () => {
      window.removeEventListener("traclytag_packaging_level_visibility_changed", handleCustomChange);
    };
  }, []);

  const toggleVisibility = async (hide: boolean) => {
    try {
      const res = await fetch("/api/system-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hidePackagingLevel: hide }),
      });
      if (res.ok) {
        setHidePackagingLevel(hide);
        window.dispatchEvent(new Event("traclytag_packaging_level_visibility_changed"));
      }
    } catch (err) {
      // ignore
    }
  };

  return { hidePackagingLevel, toggleVisibility };
}
