"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";

export default function FacebookMaterialRedirect() {
  const router = useRouter();
  const params = useParams();

  useEffect(() => {
    const materialId = params.id as string;

    // materialId가 있으면 그대로 사용 (숫자, 문자열 모두 허용)
    if (materialId) {
      // 소재 번호/이름을 포함하여 메인 페이지로 리다이렉트
      router.replace(
        `/?utm_source=facebook&utm_medium=social&utm_campaign=material_${materialId}&material_id=${materialId}`
      );
    } else {
      // materialId가 없으면 일반 페이스북 페이지로 리다이렉트
      router.replace(
        "/?utm_source=facebook&utm_medium=social&utm_campaign=recruitment"
      );
    }
  }, [router, params]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        <p className="mt-4 text-gray-600">이동 중...</p>
      </div>
    </div>
  );
}
