import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export const maxDuration = 90;

// 목록 조회(GET) · 상태 고치기(PATCH) · 지우기(DELETE)는 없앴다 (2026-11-10).
// 로그인 확인 없이 열려 있어 누구나 주소만 알면 신청자 전체 목록(이름 · 연락처 · 생년월일 · 주소)을 받고 고치고 지울 수 있었다.
// 이 랜딩은 신청 저장(POST)만 쓴다 — 목록 · 관리는 오피스(실습 전국반)에서 한다.

// POST: 실습 신청 저장
export async function POST(request: NextRequest) {
  try {
    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.SUPABASE_SERVICE_ROLE_KEY
    ) {
      return NextResponse.json(
        { error: "Supabase configuration missing" },
        { status: 500 },
      );
    }

    const body = await request.json();
    const {
      name,
      gender,
      contact,
      birth_date,
      address,
      address_detail,
      zonecode,
      desired_date,
      desired_semester,
      report_date,
      practice_type,
      desired_weekday,
      own_car,
      manager,
      privacy_agreed,
      terms_agreed,
      click_source,
    } = body;

    // 필수 필드 검사
    if (
      !name ||
      !gender ||
      !contact ||
      !birth_date ||
      !address ||
      !address_detail ||
      !desired_date ||
      !desired_semester ||
      !report_date ||
      !practice_type ||
      !desired_weekday ||
      !own_car ||
      // 담당자 성함 — 유입경로를 고르는 링크(/apply, source_mode)는 담당자를 비워 보낸다(오피스에서 지정).
      // 그때는 대신 유입경로(click_source)가 있어야 한다 (2026-11-10)
      (body.source_mode === true ? !click_source : !manager)
    ) {
      return NextResponse.json(
        { error: "All required fields must be filled" },
        { status: 400 },
      );
    }

    // 성별 검증
    if (!["남", "여"].includes(gender)) {
      return NextResponse.json({ error: "Invalid gender" }, { status: 400 });
    }

    // 자차 사용 여부 검증
    if (!["O", "X"].includes(own_car)) {
      return NextResponse.json({ error: "Invalid own_car" }, { status: 400 });
    }

    // 실습 유형 검증
    const validPracticeTypes = [
      "사회복지사 실습 160시간",
      "사회복지사 실습 120시간",
      "보육교사 실습 240시간",
      "평생교육사 실습 160시간",
      "한국어교원 실습",
    ];
    if (!validPracticeTypes.includes(practice_type)) {
      return NextResponse.json(
        { error: "Invalid practice type" },
        { status: 400 },
      );
    }

    // 실습유형 → 분류(category): 사회복지사 / 그 외(보육·평생교육사·한국어교원) = 타과정
    const category = practice_type.includes("사회복지사")
      ? "사회복지사"
      : "타과정";

    const { data, error } = await supabaseAdmin
      .from("practice_applications")
      .insert([
        {
          name,
          gender,
          contact,
          birth_date,
          address,
          address_detail: address_detail || null,
          zonecode: zonecode || null,
          desired_date,
          desired_semester,
          grade_report_date: report_date,
          practice_type,
          desired_weekday,
          own_car,
          category,
          manager: manager || null,
          privacy_agreed: privacy_agreed || false,
          terms_agreed: terms_agreed || false,
          click_source: click_source || null,
          status: "pending",
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("Error saving practice application:", error);
      return NextResponse.json(
        { error: "Failed to save practice application" },
        { status: 500 },
      );
    }

    // 오피스 실습 전국반(practice_applicants, category=전국반)에 바로 행 생성 — 결제 단계가 없다.
    try {
      const fullAddress = address_detail
        ? `${address} ${address_detail}`
        : address;
      const { error: syncError } = await supabaseAdmin.from("practice_applicants").insert({
        source_application_id: data.id,
        name,
        gender,
        contact,
        birth_date,
        address: fullAddress,
        desired_date,
        desired_semester,
        grade_report_date: report_date,
        practice_type,
        desired_weekday,
        own_car,
        manager: manager || null,
        // 유입경로 — 오피스 실습 전국반 「유입경로」 칸 (2026-11-10)
        click_source: click_source || null,
        // 전국반 = baroapply 전용 분류 (오피스 '실습 전국반' 페이지에서만 조회)
        category: "전국반",
        status: "추후진행예정",
      });
      // 저장 오류는 던져지지 않고 값으로 온다 — 기록은 남긴다(신청 자체는 유지)
      if (syncError)
        console.error("[practice_applicants] 동기화 실패(신청은 유지):", syncError);
    } catch (syncErr) {
      console.error("[practice_applicants] 동기화 실패(신청은 유지):", syncErr);
    }

    return NextResponse.json(
      { message: "Practice application submitted successfully", data },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error saving practice application:", error);
    return NextResponse.json(
      { error: "Failed to save practice application" },
      { status: 500 },
    );
  }
}
