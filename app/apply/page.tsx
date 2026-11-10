"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// 유입경로를 고르는 신청 링크 — https://baroapply.vercel.app/apply (2026-11-10)
// 화면은 기본 신청 폼과 같고 「담당자 성함」 자리만 「알게 된 경로」 선택(네이버 · 당근 · 인스타/페북 · 구글 · 지인소개)으로 바뀐다.
// 주소에 붙어 온 값(utm 등)은 그대로 넘긴다.
export default function ApplyBySourceRedirect() {
  const router = useRouter();

  useEffect(() => {
    const extra = window.location.search.replace(/^\?/, "");
    router.replace(`/?form=source${extra ? `&${extra}` : ""}`);
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        <p className="mt-4 text-gray-600">이동 중...</p>
      </div>
    </div>
  );
}
