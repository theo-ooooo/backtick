"use client";

import { AppProgressBar } from "next-nprogress-bar";

/** 페이지 이동 중 상단 코랄 프로그레스 바. */
export function ProgressBar() {
  return <AppProgressBar height="3px" color="#e0533d" options={{ showSpinner: false }} shallowRouting />;
}
