import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { sendConsultationEmail } from '@/lib/email';

// Vercel Serverless 함수 타임아웃 설정 (초 단위)
export const maxDuration = 90;

// 목록 조회(GET) · 고치기(PATCH) · 지우기(DELETE)는 없앴다 (2026-11-10).
// 로그인 확인 없이 열려 있어 누구나 주소만 알면 실습 상담 신청자 목록(이름 · 연락처)을 받고 고치고 지울 수 있었다.
// 목록 · 관리는 오피스(교육 지원 > 실습 신청)에서 한다.

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
