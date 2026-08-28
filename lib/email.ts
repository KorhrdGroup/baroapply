import nodemailer from "nodemailer";

interface ConsultationEmailData {
  name: string;
  contact: string;
  education: string;
  hope_course?: string | null;
  reason: string;
  click_source?: string | null;
}

// Brevo SMTP Transporter 생성
function createTransporter() {
  const smtpLogin = process.env.BREVO_SMTP_LOGIN;
  const smtpKey = process.env.BREVO_SMTP_KEY;

  if (!smtpLogin || !smtpKey) {
    throw new Error("BREVO_SMTP_LOGIN and BREVO_SMTP_KEY must be set");
  }

  return nodemailer.createTransport({
    host: "smtp-relay.brevo.com",
    port: 465, // SSL 포트 사용 (Vercel 등 클라우드 플랫폼에서 더 안정적)
    secure: true, // 465 포트 사용 시 true
    auth: {
      user: smtpLogin,
      pass: smtpKey,
    },
    connectionTimeout: 10000, // 10초
    greetingTimeout: 10000, // 10초
    socketTimeout: 10000, // 10초
  });
}

// 한국 시간(KST, UTC+9)으로 변환하는 함수
function getKoreanTime(): string {
  const now = new Date();
  
  // Asia/Seoul 타임존으로 변환
  const koreanTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
  
  // 한국 시간 형식으로 포맷팅: "2026. 1. 20. 오전 7:30:34"
  const year = koreanTime.getFullYear();
  const month = koreanTime.getMonth() + 1;
  const day = koreanTime.getDate();
  const hours = koreanTime.getHours();
  const minutes = koreanTime.getMinutes();
  const seconds = koreanTime.getSeconds();
  
  const ampm = hours < 12 ? "오전" : "오후";
  const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  
  const formattedMinutes = minutes.toString().padStart(2, "0");
  const formattedSeconds = seconds.toString().padStart(2, "0");
  
  return `${year}. ${month}. ${day}. ${ampm} ${displayHours}:${formattedMinutes}:${formattedSeconds}`;
}

export async function sendConsultationEmail(data: ConsultationEmailData) {
  console.log("[EMAIL] sendConsultationEmail 함수 시작");
  console.log(
    "[EMAIL] 받은 데이터:",
    JSON.stringify({ ...data, contact: data.contact ? "***" : "" }, null, 2)
  );

  try {
    // 한국 시간 가져오기
    const koreanTime = getKoreanTime();
    
    // Brevo 설정 확인
    const smtpLogin = process.env.BREVO_SMTP_LOGIN;
    const smtpKey = process.env.BREVO_SMTP_KEY;
    const fromEmail = process.env.BREVO_FROM_EMAIL || smtpLogin;
    const fromName = process.env.BREVO_FROM_NAME || "한평생 바로기업";

    // 수신자 이메일: CONSULTATION_EMAIL이 있으면 사용, 없으면 기본값
    const recipientEmail = process.env.CONSULTATION_EMAIL || "bp4sp4@naver.com";
    // 로고 URL - 배포된 사이트의 로고 사용
    const logoUrl = "https://barosocial.vercel.app/logo.png";

    console.log("[EMAIL] 설정 확인:");
    console.log("[EMAIL] - BREVO_SMTP_LOGIN 존재:", !!smtpLogin);
    console.log(
      "[EMAIL] - BREVO_SMTP_LOGIN 값:",
      smtpLogin ? `${smtpLogin.substring(0, 3)}***` : "없음"
    );
    console.log("[EMAIL] - BREVO_SMTP_KEY 존재:", !!smtpKey);
    console.log("[EMAIL] - BREVO_SMTP_KEY 길이:", smtpKey ? smtpKey.length : 0);
    console.log(
      "[EMAIL] - BREVO_FROM_EMAIL:",
      fromEmail ? `${fromEmail.substring(0, 3)}***` : "없음"
    );
    console.log(
      "[EMAIL] - recipientEmail:",
      recipientEmail ? `${recipientEmail.substring(0, 3)}***` : "없음"
    );
    console.log("[EMAIL] - logoUrl:", logoUrl);

    if (!smtpLogin || !smtpKey) {
      console.error("[EMAIL] Brevo 환경 변수가 설정되지 않음");
      return {
        success: false,
        error: "BREVO_SMTP_LOGIN and BREVO_SMTP_KEY must be set",
      };
    }

    if (!recipientEmail) {
      console.error("[EMAIL] 수신자 이메일이 설정되지 않음");
      return { success: false, error: "Email not configured" };
    }

    // Transporter 생성
    const transporter = createTransporter();

    // SMTP 연결 확인 (선택적 - 실패해도 이메일 전송 시도)
    console.log("[EMAIL] SMTP 연결 확인 중...");
    try {
      await new Promise<void>((resolve, reject) => {
        transporter.verify(function (error: Error | null) {
          if (error) {
            console.warn("[EMAIL] SMTP 연결 확인 실패 (계속 진행):", error.message);
            // 연결 확인 실패해도 이메일 전송은 시도
            resolve();
          } else {
            console.log("[EMAIL] SMTP 연결 확인 성공");
            resolve();
          }
        });
      });
    } catch (verifyError) {
      console.warn("[EMAIL] SMTP 연결 확인 중 예외 발생 (계속 진행):", verifyError);
      // 연결 확인 실패해도 이메일 전송은 시도
    }

    // 기존 HTML 템플릿 그대로 사용
    const emailHtml = `
      <!DOCTYPE html>
      <html lang="ko">
      <head>
        <meta charset="UTF-8">
        <style>
          @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css');
          body { font-family: 'Pretendard', sans-serif; -webkit-font-smoothing: antialiased; }
        </style>
      </head>
      <body style="margin: 0; padding: 0; background-color: #ffffff; color: #191f28;">
        <div style="max-width: 600px; margin: 0 auto; padding: 60px 24px;">
          <div style="margin-bottom: 48px;">
            <img src="${logoUrl}" alt="한평생 바로기업" style="height: 32px; width: auto;" />
          </div>

          <div style="margin-bottom: 40px;">
            <h1 style="font-size: 28px; font-weight: 700; line-height: 1.4; margin: 0; color: #191f28;">
              새로운 상담 신청이<br />도착했어요
            </h1>
          </div>

          <div style="background-color: #f9fafb; border-radius: 20px; padding: 32px;">
            <table role="presentation" style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding-bottom: 20px; font-size: 15px; color: #4e5968; width: 100px;">이름</td>
                <td style="padding-bottom: 20px; font-size: 17px; font-weight: 600; color: #191f28; text-align: right;">${
                  data.name
                }</td>
              </tr>
              <tr>
                <td style="padding-bottom: 20px; font-size: 15px; color: #4e5968;">연락처</td>
                <td style="padding-bottom: 20px; font-size: 17px; font-weight: 600; color: #3182f6; text-align: right;">
                  <a href="tel:${data.contact.replace(
                    /-/g,
                    ""
                  )}" style="color: #3182f6; text-decoration: none;">${
      data.contact
    }</a>
                </td>
              </tr>
              <tr>
                <td style="padding-bottom: 20px; font-size: 15px; color: #4e5968;">최종학력</td>
                <td style="padding-bottom: 20px; font-size: 17px; font-weight: 600; color: #191f28; text-align: right;">${
                  data.education
                }</td>
              </tr>
              <tr>
                <td style="padding-bottom: 20px; font-size: 15px; color: #4e5968;">희망과정</td>
                <td style="padding-bottom: 20px; font-size: 17px; font-weight: 600; color: #191f28; text-align: right;">${
                  data.hope_course || "미입력"
                }</td>
              </tr>
              <tr>
                <td style="padding-bottom: 20px; font-size: 15px; color: #4e5968;">취득사유</td>
                <td style="padding-bottom: 20px; font-size: 17px; font-weight: 600; color: #191f28; text-align: right;">${
                  data.reason
                }</td>
              </tr>
              <tr>
                <td style="padding-bottom: 20px; font-size: 15px; color: #4e5968;">유입 경로</td>
                <td style="padding-bottom: 20px; font-size: 17px; font-weight: 600; color: #191f28; text-align: right;">${
                  data.click_source || "바로폼"
                }</td>
              </tr>
              <tr style="border-top: 1px solid #ebedf0;">
                <td style="padding-top: 20px; font-size: 14px; color: #8b95a1;">신청 시각</td>
                <td style="padding-top: 20px; font-size: 14px; color: #8b95a1; text-align: right;">${koreanTime}</td>
              </tr>
            </table>
          </div>

          <div style="margin-top: 40px;">
            <a href="tel:${data.contact.replace(/-/g, "")}" 
               style="display: inline-block; background-color: #3182f6; color: #ffffff; padding: 16px 32px; border-radius: 12px; font-size: 16px; font-weight: 600; text-decoration: none; width: calc(100% - 64px); text-align: center;">
              지금 바로 전화하기
            </a>
          </div>

          <div style="margin-top: 60px; padding-top: 32px; border-top: 1px solid #f2f4f6; text-align: left;">
            <p style="margin: 0; font-size: 13px; color: #8b95a1; line-height: 1.6;">
              본 메일은 한평생 바로기업 웹사이트를 통해 수신되었습니다.<br />
              서울시 도봉구 창동 마들로13길 61 씨드큐브 905호 | 02-2135-6221
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    const emailText = `
새로운 사회복지사 상담 신청이 접수되었습니다.

이름: ${data.name}
연락처: ${data.contact}
최종학력: ${data.education}
희망과정: ${data.hope_course || "미입력"}
취득사유: ${data.reason}
유입 경로: ${data.click_source || "바로폼"}
신청 시간: ${koreanTime}
    `;

    // 이메일 전송
    const mailData = {
      from: fromName ? `${fromName} <${fromEmail}>` : fromEmail,
      to: recipientEmail,
      subject: `[상담 접수] ${data.name}님`,
      html: emailHtml,
      text: emailText,
    };

    console.log("[EMAIL] Brevo 전송 시도 중...");
    console.log("[EMAIL] - from:", mailData.from);
    console.log("[EMAIL] - to:", recipientEmail);
    console.log("[EMAIL] - subject:", mailData.subject);

    const info = await new Promise<nodemailer.SentMessageInfo>(
      (resolve, reject) => {
        // 타임아웃 설정 (60초)
        const timeout = setTimeout(() => {
          reject(new Error("이메일 전송 타임아웃 (60초 초과)"));
        }, 60000);

        transporter.sendMail(mailData, (err: Error | null, info: nodemailer.SentMessageInfo) => {
          clearTimeout(timeout);
          if (err) {
            console.error("[EMAIL] sendMail 에러:", err);
            console.error("[EMAIL] 에러 코드:", (err as any).code);
            console.error("[EMAIL] 에러 명령:", (err as any).command);
            reject(err);
          } else {
            console.log("[EMAIL] sendMail 성공:", info);
            resolve(info);
          }
        });
      }
    );

    console.log("[EMAIL] ✅ 메일 전송 성공!");
    console.log("[EMAIL] - messageId:", info.messageId);
    console.log("[EMAIL] - response:", info.response);

    // 슬랙 웹훅 알림 전송 (비동기, 실패해도 이메일 전송은 성공 처리)
    const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;
    console.log("[SLACK] 슬랙 웹훅 URL 존재:", !!slackWebhookUrl);
    
    if (slackWebhookUrl) {
      try {
        // 슬랙 메시지 포맷 (가장 안정적인 기본 포맷)
        const phoneNumber = data.contact.replace(/-/g, "");
        const slackMessage = {
          text: "새 상담 신청 접수",
          blocks: [
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: `*새 상담 신청 접수*\n\n*이름/기업명:* ${data.name}\n*연락처:* ${data.contact}\n*희망과정:* ${data.hope_course || "미입력"}\n*유입 경로:* ${data.click_source || "랜딩페이지"}\n*신청 시각:* ${koreanTime}`,
              },
            },
          ],
        };

        console.log("[SLACK] 슬랙 메시지 전송 시도 중...");
        console.log("[SLACK] 웹훅 URL:", slackWebhookUrl.substring(0, 30) + "...");
        console.log("[SLACK] 메시지 내용:", JSON.stringify(slackMessage, null, 2));

        // 타임아웃 설정 (10초)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const slackResponse = await fetch(slackWebhookUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(slackMessage),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        const responseText = await slackResponse.text();
        console.log("[SLACK] 슬랙 응답 상태:", slackResponse.status);
        console.log("[SLACK] 슬랙 응답 내용:", responseText);

        if (slackResponse.ok) {
          console.log("[SLACK] ✅ 슬랙 알림 전송 성공");
        } else {
          console.error("[SLACK] ❌ 슬랙 알림 전송 실패:", responseText);
        }
      } catch (slackError) {
        console.error("[SLACK] ❌ 슬랙 알림 전송 중 오류 발생");
        console.error(
          "[SLACK] 에러 타입:",
          slackError instanceof Error ? slackError.constructor.name : typeof slackError
        );
        console.error(
          "[SLACK] 에러 메시지:",
          slackError instanceof Error ? slackError.message : String(slackError)
        );
        console.error(
          "[SLACK] 에러 스택:",
          slackError instanceof Error ? slackError.stack : "스택 없음"
        );
        // 슬랙 전송 실패해도 이메일 전송은 성공 처리
      }
    } else {
      console.warn("[SLACK] SLACK_WEBHOOK_URL이 설정되지 않아 슬랙 알림을 건너뜁니다");
    }

    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("[EMAIL] ❌ 메일 전송 실패! - catch 블록 진입");
    console.error("[EMAIL] 에러 발생 시각:", new Date().toISOString());
    console.error("[EMAIL] 에러 타입:", error?.constructor?.name);
    console.error(
      "[EMAIL] 에러 메시지:",
      error instanceof Error ? error.message : String(error)
    );
    console.error(
      "[EMAIL] 에러 스택:",
      error instanceof Error ? error.stack : "스택 없음"
    );

    // 전체 에러 객체 출력
    try {
      console.error(
        "[EMAIL] 전체 에러 객체:",
        JSON.stringify(error, Object.getOwnPropertyNames(error), 2)
      );
    } catch (e) {
      console.error("[EMAIL] 에러 객체 직렬화 실패:", e);
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
