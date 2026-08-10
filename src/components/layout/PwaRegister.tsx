"use client";

import { useEffect } from "react";

/** 서비스워커 등록 — PWA 설치 요건. */
export function PwaRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return null;
}
