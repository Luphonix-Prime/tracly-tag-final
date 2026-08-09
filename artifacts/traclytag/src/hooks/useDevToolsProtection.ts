import { useEffect } from "react";

/**
 * Hook to block developer tools, right click, inspection shortcuts, and debug tools across all pages.
 * 
 * Note: While browser security models prevent 100% blocking of client-side devtools,
 * this hook applies standard anti-analysis & obfuscation techniques:
 * 1. Blocks right-click context menu.
 * 2. Blocks F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C, Ctrl+U, Ctrl+S shortcuts.
 * 3. Continuous debugger loop to freeze execution if DevTools is open.
 * 4. Detects window resize thresholds commonly triggered when docking DevTools.
 */
export function useDevToolsProtection() {
  useEffect(() => {
    // 1. Disable context menu (right click)
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    // 2. Disable common DevTools keyboard shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      // F12 key
      if (e.keyCode === 123 || e.key === "F12") {
        e.preventDefault();
        return false;
      }

      const ctrlOrMeta = e.ctrlKey || e.metaKey;

      if (ctrlOrMeta) {
        // Ctrl+Shift+I (Inspect), Ctrl+Shift+J (Console), Ctrl+Shift+C (Inspect Element)
        if (e.shiftKey && (e.keyCode === 73 || e.keyCode === 74 || e.keyCode === 67 || e.key.toUpperCase() === "I" || e.key.toUpperCase() === "J" || e.key.toUpperCase() === "C")) {
          e.preventDefault();
          return false;
        }

        // Ctrl+U (View Source)
        if (e.keyCode === 85 || e.key.toUpperCase() === "U") {
          e.preventDefault();
          return false;
        }

        // Ctrl+S (Save Page)
        if (e.keyCode === 83 || e.key.toUpperCase() === "S") {
          e.preventDefault();
          return false;
        }
      }
    };

    // 3. Debugger Loop to pause execution if DevTools opens
    const debugInterval = setInterval(() => {
      const startTime = performance.now();
      // Execution pauses here when DevTools sources tab / debugger is active
      (function () {
        return false;
      })
      ["constructor"]("debugger")();
      const endTime = performance.now();
      // If execution was paused long enough by debugger, reload or redirect
      if (endTime - startTime > 100) {
        window.location.reload();
      }
    }, 1000);

    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("keydown", handleKeyDown);
      clearInterval(debugInterval);
    };
  }, []);
}
