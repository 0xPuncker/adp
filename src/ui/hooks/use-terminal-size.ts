import { useState, useEffect } from "react";
import { useStdout } from "ink";

export interface TerminalSize {
  columns: number;
  rows: number;
  isNarrow: boolean;  // < 80 columns
  isShort: boolean;   // < 24 rows
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
      isShort: rows < 24,
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
