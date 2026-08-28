"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function GoogleRedirect() {
  const router = useRouter();

  useEffect(() => {
    // UTM 파라미터를 추가하여 메인 페이지로 리다이렉트
    router.replace(
      "/?utm_source=google&utm_medium=social&utm_campaign=recruitment"
    );
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
