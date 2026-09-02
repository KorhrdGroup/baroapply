import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export const maxDuration = 90;

// GET: 실습 신청 목록 조회
export async function GET() {
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

    const { data, error } = await supabaseAdmin
      .from("practice_applications")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching practice applications:", error);
      return NextResponse.json(
        { error: "Failed to fetch practice applications" },
        { status: 500 },
      );
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error("Error reading practice applications:", error);
    return NextResponse.json(
      { error: "Failed to fetch practice applications" },
      { status: 500 },
    );
  }
}

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
      !own_car
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
          manager: null,
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
      await supabaseAdmin.from("practice_applicants").insert({
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
        manager: null,
        // 전국반 = baroapply 전용 분류 (오피스 '실습 전국반' 페이지에서만 조회)
        category: "전국반",
        status: "추후진행예정",
      });
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

// PATCH: 상태 업데이트
export async function PATCH(request: NextRequest) {
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
    const { id, ...updateFields } = body;

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    if (Object.keys(updateFields).length === 0) {
      return NextResponse.json(
        { error: "At least one field is required for update" },
        { status: 400 },
      );
    }

    const { data, error } = await supabaseAdmin
      .from("practice_applications")
      .update(updateFields)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating practice application:", error);
      return NextResponse.json(
        { error: "Failed to update practice application" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      message: "Practice application updated successfully",
      data,
    });
  } catch (error) {
    console.error("Error updating practice application:", error);
    return NextResponse.json(
      { error: "Failed to update practice application" },
      { status: 500 },
    );
  }
}

// DELETE: 실습 신청 삭제
export async function DELETE(request: NextRequest) {
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
    const { ids } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "IDs array is required" },
        { status: 400 },
      );
    }

    const { data, error } = await supabaseAdmin
      .from("practice_applications")
      .delete()
      .in("id", ids)
      .select();

    if (error) {
      console.error("Error deleting practice applications:", error);
      return NextResponse.json(
        { error: "Failed to delete practice applications" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      message: "Practice applications deleted successfully",
      data,
    });
  } catch (error) {
    console.error("Error deleting practice applications:", error);
    return NextResponse.json(
      { error: "Failed to delete practice applications" },
      { status: 500 },
    );
  }
}
