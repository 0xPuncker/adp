import { useState, useEffect } from "react";
import { useStdout } from "ink";

export interface TerminalSize {
  columns: number;
  rows: number;
  isNarrow: boolean;       // < 80 columns — primary panels stack vertically
  isVeryNarrow: boolean;   // < 90 columns — live agent panel is hidden entirely
  isShort: boolean;        // < 24 rows
  isWide: boolean;         // >= 120 columns — three-column dashboard layout
}

export function useTerminalSize(): TerminalSize {
  const { stdout } = useStdout();

  const getSize = (): TerminalSize => {
    const columns = stdout?.columns ?? 80;
    const rows = stdout?.rows ?? 24;
    return {
      columns,
      rows,
      isNarrow: columns < 80,
      isVeryNarrow: columns < 90,
      isShort: rows < 24,
      isWide: columns >= 120,
    };
  };

  const [size, setSize] = useState<TerminalSize>(getSize);

  useEffect(() => {
    const onResize = () => setSize(getSize());
    stdout?.on("resize", onResize);
    return () => { stdout?.off("resize", onResize); };
  }, [stdout]);

  return size;
}
