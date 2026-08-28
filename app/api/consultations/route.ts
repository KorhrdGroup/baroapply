import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { sendConsultationEmail } from '@/lib/email';

// Vercel Serverless 함수 타임아웃 설정 (초 단위)
export const maxDuration = 90;

// GET: 상담 신청 목록 조회
export async function GET() {
  try {
    // 환경 변수 확인
    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.SUPABASE_SERVICE_ROLE_KEY
    ) {
      return NextResponse.json(
        { error: 'Supabase configuration missing' },
        { status: 500 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('practice_consultations')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching consultations:', error);
      return NextResponse.json(
        { error: 'Failed to fetch consultations' },
        { status: 500 }
      );
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Error reading consultations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch consultations' },
      { status: 500 }
    );
  }
}

// POST: 상담 신청 저장
export async function POST(request: NextRequest) {
  try {
    // 환경 변수 확인
    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.SUPABASE_SERVICE_ROLE_KEY
    ) {
      return NextResponse.json(
        { error: 'Supabase configuration missing' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const {
      name,
      contact,
      type,
      progress,
      practice_place,
      employment_consulting,
      employment_connection,
      employment_after_cert,
      student_status,
      education,
      hope_course,
      reason,
      click_source,
      is_manual_entry,
      residence,
      study_method,
      address,
    } = body;

    // 유효성 검사 - 이름과 연락처만 필수
    if (!name || !contact) {
      return NextResponse.json(
        { error: 'Name and contact are required' },
        { status: 400 }
      );
    }

    // Supabase에 데이터 저장
    const { data, error } = await supabaseAdmin
      .from('practice_consultations')
      .insert([
        {
          name,
          contact,
          type: type || 'consultation',
          progress: progress || null,
          practice_place: practice_place || null,
          employment_consulting: employment_consulting || false,
          employment_connection: employment_connection || false,
          employment_after_cert: employment_after_cert || null,
          student_status: student_status || '상담대기',
          education: education || null,
          hope_course: hope_course || null,
          reason: reason || null,
          click_source: click_source || null,
          residence: residence || null,
          study_method: study_method || null,
          address: address || null,
          status: '상담대기', // 기본 상태
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Error saving consultation:', error);
      return NextResponse.json(
        { error: 'Failed to save consultation' },
        { status: 500 }
      );
    }

    // 이메일 알림 전송 (비동기, 실패해도 상담 신청은 성공 처리)
    // 수동 추가가 아닐 때만 이메일 전송
    if (!is_manual_entry) {
      console.log('[EMAIL] 이메일 전송 시도 시작');
      console.log('[EMAIL] 환경 변수 확인:');
      console.log(
        '[EMAIL] - BREVO_SMTP_LOGIN 존재:',
        !!process.env.BREVO_SMTP_LOGIN
      );
    console.log(
      '[EMAIL] - BREVO_SMTP_LOGIN 값:',
      process.env.BREVO_SMTP_LOGIN
        ? `${process.env.BREVO_SMTP_LOGIN.substring(0, 3)}***`
        : '없음'
    );
    console.log('[EMAIL] - BREVO_SMTP_KEY 존재:', !!process.env.BREVO_SMTP_KEY);
    console.log(
      '[EMAIL] - BREVO_SMTP_KEY 길이:',
      process.env.BREVO_SMTP_KEY ? process.env.BREVO_SMTP_KEY.length : 0
    );
    console.log(
      '[EMAIL] - CONSULTATION_EMAIL:',
      process.env.CONSULTATION_EMAIL || '없음'
    );
    console.log(
      '[EMAIL] - BREVO_FROM_EMAIL:',
      process.env.BREVO_FROM_EMAIL || '없음'
    );
    console.log(
      '[EMAIL] - BREVO_FROM_NAME:',
      process.env.BREVO_FROM_NAME || '없음'
    );

    // Brevo 환경 변수 확인
    if (process.env.BREVO_SMTP_LOGIN && process.env.BREVO_SMTP_KEY) {
      console.log('[EMAIL] 이메일 전송 함수 호출');
      // await로 기다려서 Serverless 함수가 종료되기 전에 이메일 전송 완료
      try {
        const emailResult = await sendConsultationEmail({
          name,
          contact,
          education,
          hope_course: hope_course || null,
          reason,
          click_source: click_source || null,
        });
        console.log(
          '[EMAIL] 이메일 전송 결과:',
          JSON.stringify(emailResult, null, 2)
        );
      } catch (emailError: unknown) {
        // 이메일 전송 실패해도 상담 신청은 성공 처리
        console.error('[EMAIL] 이메일 전송 실패:');
        console.error(
          '[EMAIL] 에러 타입:',
          emailError instanceof Error
            ? emailError.constructor.name
            : typeof emailError
        );
        console.error(
          '[EMAIL] 에러 메시지:',
          emailError instanceof Error ? emailError.message : String(emailError)
        );
        console.error(
          '[EMAIL] 에러 스택:',
          emailError instanceof Error ? emailError.stack : '스택 없음'
        );
        console.error(
          '[EMAIL] 전체 에러 객체:',
          JSON.stringify(emailError, Object.getOwnPropertyNames(emailError), 2)
        );
      }
    } else {
      console.warn(
        '[EMAIL] Brevo 환경 변수가 설정되지 않아 이메일 전송을 건너뜁니다'
      );
      console.warn(
        '[EMAIL] 필요한 환경 변수: BREVO_SMTP_LOGIN, BREVO_SMTP_KEY'
      );
    }
    } else {
      console.log('[EMAIL] 수동 추가로 이메일 전송을 건너뜁니다.');
    }

    // Slack 알림 전송 (수동 추가 포함)
    if (process.env.SLACK_WEBHOOK_URL) {
      console.log('[SLACK] Slack 알림 전송 시도');
      try {
        const slackMessage = {
          text: is_manual_entry 
            ? '🆕 *관리자가 새로운 상담 신청을 추가했습니다*'
            : '📝 *새로운 상담 신청이 접수되었습니다*',
          blocks: [
            {
              type: 'header',
              text: {
                type: 'plain_text',
                text: is_manual_entry 
                  ? '🆕 관리자 추가 상담 신청'
                  : '📝 새로운 상담 신청',
              },
            },
            {
              type: 'section',
              fields: [
                {
                  type: 'mrkdwn',
                  text: `*이름:*\n${name}`,
                },
                {
                  type: 'mrkdwn',
                  text: `*연락처:*\n${contact}`,
                },
                {
                  type: 'mrkdwn',
                  text: `*학력:*\n${education || '미입력'}`,
                },
                {
                  type: 'mrkdwn',
                  text: `*희망과정:*\n${hope_course || '미입력'}`,
                },
                {
                  type: 'mrkdwn',
                  text: `*유입경로:*\n${click_source || '미입력'}`,
                },
              ],
            },
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `*상담 이유:*\n${reason || '미입력'}`,
              },
            },
            {
              type: 'context',
              elements: [
                {
                  type: 'mrkdwn',
                  text: `접수 시간: ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}`,
                },
              ],
            },
          ],
        };

        const slackResponse = await fetch(process.env.SLACK_WEBHOOK_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(slackMessage),
        });

        if (slackResponse.ok) {
          console.log('[SLACK] Slack 알림 전송 성공');
        } else {
          console.error('[SLACK] Slack 알림 전송 실패:', await slackResponse.text());
        }
      } catch (slackError) {
        console.error('[SLACK] Slack 알림 전송 중 오류:', slackError);
      }
    } else {
      console.warn('[SLACK] SLACK_WEBHOOK_URL이 설정되지 않아 Slack 알림을 건너뜁니다');
    }

    return NextResponse.json(
      { message: 'Consultation request submitted successfully', data },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error saving consultation:', error);
    return NextResponse.json(
      { error: 'Failed to save consultation' },
      { status: 500 }
    );
  }
}

// PATCH: 상담 완료 상태 업데이트
export async function PATCH(request: NextRequest) {
  try {
    // 환경 변수 확인
    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.SUPABASE_SERVICE_ROLE_KEY
    ) {
      return NextResponse.json(
        { error: 'Supabase configuration missing' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const {
      id,
      is_completed,
      notes,
      status,
      memo,
      name,
      contact,
      type,
      progress,
      practice_place,
      employment_consulting,
      employment_connection,
      employment_after_cert,
      student_status,
      education,
      reason,
      click_source,
      subject_cost,
      manager,
      residence,
      study_method,
      address,
    } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    // 업데이트할 필드 구성
    const updateData: {
      is_completed?: boolean;
      notes?: string;
      status?: 'pending' | 'in_progress' | 'completed';
      memo?: string;
      name?: string;
      contact?: string;
      type?: string;
      progress?: string | null;
      practice_place?: string | null;
      employment_consulting?: boolean;
      employment_connection?: boolean;
      employment_after_cert?: string | null;
      student_status?: string | null;
      education?: string | null;
      reason?: string | null;
      click_source?: string | null;
      subject_cost?: number | null;
      manager?: string | null;
      residence?: string | null;
      study_method?: string | null;
      address?: string | null;
    } = {};

    if (typeof is_completed === 'boolean') {
      updateData.is_completed = is_completed;
    }

    if (status !== undefined) {
      updateData.status = status;
      // status가 있으면 is_completed도 함께 업데이트
      if (status === 'completed') {
        updateData.is_completed = true;
      } else if (status === 'pending') {
        updateData.is_completed = false;
      }
    }

    if (notes !== undefined) {
      updateData.notes = notes;
    }

    if (memo !== undefined) {
      updateData.memo = memo;
    }

    // 기본 정보 수정
    if (name !== undefined) {
      updateData.name = name;
    }

    if (contact !== undefined) {
      updateData.contact = contact;
    }

    if (type !== undefined) {
      updateData.type = type;
    }

    if (progress !== undefined) {
      updateData.progress = progress || null;
    }

    if (practice_place !== undefined) {
      updateData.practice_place = practice_place || null;
    }

    if (employment_consulting !== undefined) {
      updateData.employment_consulting = employment_consulting;
    }

    if (employment_connection !== undefined) {
      updateData.employment_connection = employment_connection;
    }

    if (employment_after_cert !== undefined) {
      updateData.employment_after_cert = employment_after_cert || null;
    }

    if (student_status !== undefined) {
      updateData.student_status = student_status || null;
    }

    if (education !== undefined) {
      updateData.education = education || null;
    }

    if (reason !== undefined) {
      updateData.reason = reason || null;
    }

    if (click_source !== undefined) {
      updateData.click_source = click_source || null;
    }

    if (subject_cost !== undefined) {
      updateData.subject_cost = subject_cost || null;
    }

    if (manager !== undefined) {
      updateData.manager = manager || null;
    }
    if (residence !== undefined) {
      updateData.residence = residence || null;
    }

    if (study_method !== undefined) {
      updateData.study_method = study_method || null;
    }

    if (address !== undefined) {
      updateData.address = address || null;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'At least one field is required for update' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('practice_consultations')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating completion status:', error);
      return NextResponse.json(
        { error: 'Failed to update completion status' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Completion status updated successfully',
      data,
    });
  } catch (error) {
    console.error('Error updating completion status:', error);
    return NextResponse.json(
      { error: 'Failed to update completion status' },
      { status: 500 }
    );
  }
}

// DELETE: 상담 신청 삭제
export async function DELETE(request: NextRequest) {
  try {
    // 환경 변수 확인
    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.SUPABASE_SERVICE_ROLE_KEY
    ) {
      return NextResponse.json(
        { error: 'Supabase configuration missing' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { ids } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'IDs array is required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('practice_consultations')
      .delete()
      .in('id', ids)
      .select();

    if (error) {
      console.error('Error deleting consultations:', error);
      return NextResponse.json(
        { error: 'Failed to delete consultations' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Consultations deleted successfully',
      data,
    });
  } catch (error) {
    console.error('Error deleting consultations:', error);
    return NextResponse.json(
      { error: 'Failed to delete consultations' },
      { status: 500 }
    );
  }
}
