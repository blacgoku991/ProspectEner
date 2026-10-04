"use client";

import { useEffect } from "react";
import { captureAcquisition } from "@/components/simulator/acquisition";

export function AcquisitionCapture() {
  useEffect(() => {
    captureAcquisition();
  }, []);
  return null;
}
