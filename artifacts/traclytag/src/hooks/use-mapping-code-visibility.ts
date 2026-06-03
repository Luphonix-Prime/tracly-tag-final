import { useState, useEffect } from "react";

export function useMappingCodeVisibility() {
  const [hideMappingCode, setHideMappingCode] = useState(() => {
    return localStorage.getItem("traclytag_hide_mapping_code") === "true";
  });

  useEffect(() => {
    const handleStorageChange = () => {
      setHideMappingCode(localStorage.getItem("traclytag_hide_mapping_code") === "true");
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("traclytag_mapping_visibility_changed", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("traclytag_mapping_visibility_changed", handleStorageChange);
    };
  }, []);

  const toggleVisibility = (hide: boolean) => {
    localStorage.setItem("traclytag_hide_mapping_code", String(hide));
    setHideMappingCode(hide);
    window.dispatchEvent(new Event("traclytag_mapping_visibility_changed"));
  };

  return { hideMappingCode, toggleVisibility };
}
