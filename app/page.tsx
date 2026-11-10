"use client";

import Image from "next/image";
import Script from "next/script";
import { useState, useCallback, useRef, Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import styles from "./stepflow.module.css";

declare global {
  interface Window {
    daum: {
      Postcode: new (options: {
        oncomplete: (data: KakaoPostcodeData) => void;
      }) => { open: () => void };
    };
  }
}

interface KakaoPostcodeData {
  zonecode: string;
  address: string;
  roadAddress: string;
  jibunAddress: string;
  addressType: string;
  sido: string;
  sigungu: string;
}

const formatClickSource = (
  utmSource: string,
  materialId: string | null,
  blogId: string | null = null,
  cafeId: string | null = null,
): string => {
  const sourceMap: { [key: string]: string } = {
    daangn: "당근",
    insta: "인스타",
    facebook: "페이스북",
    google: "구글",
    youtube: "유튜브",
    kakao: "카카오",
    naver: "네이버",
    naverblog: "네이버블로그",
    toss: "토스",
    mamcafe: "맘카페",
  };

  const shortSource = sourceMap[utmSource] || utmSource;
  const homepageName = "실습섭외신청";

  if (blogId) return `${homepageName}_${shortSource}_${blogId}`;
  if (cafeId) return `${homepageName}_${shortSource}_${cafeId}`;
  if (materialId) return `${homepageName}_${shortSource}_소재_${materialId}`;
  return `${homepageName}_${shortSource}`;
};

/**
 * 유입경로를 고르는 신청 링크(/apply → /?form=source) — 화면은 같고 「담당자 성함」 자리만 「알게 된 경로」 선택으로 바뀐다
 * (2026-11-10 요청: 「다 동일한데 담당자 성함 쪽 네이버 · 당근 · 인스타/페북 · 구글 · 지인소개 선택칸, 새 링크」).
 * 고른 값은 유입경로(click_source 「실습섭외신청_당근」)로 저장돼 오피스 실습 전국반의 「유입경로」 칸에 보이고,
 * 담당자는 비워 둔다(오피스에서 지정) — 같은 날 사용자 「유입경로 하나 만들어주고 담당자는 빈칸으로」.
 */
const SOURCE_OPTIONS = ["네이버", "당근", "인스타/페북", "구글", "지인소개"];

function ClickSourceHandler({
  onSourceChange,
  onModeChange,
}: {
  onSourceChange: (source: string) => void;
  onModeChange: (sourceMode: boolean) => void;
}) {
  const searchParams = useSearchParams();
  const sourceMode = searchParams.get("form") === "source";
  useEffect(() => {
    onModeChange(sourceMode);
  }, [sourceMode, onModeChange]);

  const utmSource = searchParams.get("utm_source");
  const materialId = searchParams.get("material_id");
  const blogId = searchParams.get("blog_id");
  const cafeId = searchParams.get("cafe_id");

  if (utmSource) {
    const formatted = formatClickSource(utmSource, materialId, blogId, cafeId);
    onSourceChange(formatted);
  }

  return null;
}

const PRACTICE_TYPES = [
  "사회복지사 실습 160시간",
  "사회복지사 실습 120시간",
];
// 유입경로를 고르는 링크(/apply)에서만 보이는 「잘 모르겠어요」 — 담당자가 없어 시간을 확인받지 못한 신청자용 (2026-11-10)
// 저장값에 「사회복지사」가 들어 있어야 서버 · 오피스가 사회복지사 과정으로 묶는다
const PRACTICE_TYPE_UNSURE = "사회복지사 실습 (시간 미확인)";

// 현장실습 희망날짜: 년/월 선택 (DB 포맷 "25년 06월"에 맞춤)
const DESIRED_YEAR_OPTIONS = ["25년", "26년", "27년", "28년"];
const DESIRED_MONTH_OPTIONS = Array.from(
  { length: 12 },
  (_, i) => `${String(i + 1).padStart(2, "0")}월`,
);

// 실습 진행일
const WEEKDAY_OPTIONS = ["평일", "주말", "평일+주말"];

// 사전신청 인원 결정 (서울은 35명 고정, 나머지는 35~39명 랜덤)
const getRegionApplicants = (region: string) => {
  if (region === "서울") return 35;
  return 35 + Math.floor(Math.random() * 5);
};

function PracticeFormContent({
  clickSource,
  sourceMode,
}: {
  clickSource: string;
  /** 유입경로를 고르는 링크로 들어왔나 — 담당자 성함 대신 「알게 된 경로」를 고른다 */
  sourceMode: boolean;
}) {
  const [step, setStep] = useState(2);
  const [formData, setFormData] = useState({
    name: "",
    gender: "",
    contact: "",
    birth_date: "",
    address: "",
    address_detail: "",
    zonecode: "",
    desired_year: "",
    desired_month: "",
    desired_date: "",
    desired_semester: "",
    report_year: "",
    report_month: "",
    report_day: "",
    report_date: "",
    practice_type: "",
    desired_weekday: "",
    own_car: "",
    manager: "",
    // 알게 된 경로 — 유입경로를 고르는 링크(/apply)에서만 쓴다
    source: "",
  });
  const [privacyAgreed, setPrivacyAgreed] = useState(false);
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [contactError, setContactError] = useState("");
  const [regionStatus, setRegionStatus] = useState<"idle" | "loading" | "done">(
    "idle",
  );
  const [regionName, setRegionName] = useState("");
  const [regionApplicants, setRegionApplicants] = useState(0);
  const regionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  const formatContact = (value: string) => {
    const cleaned = value.replace(/[^0-9]/g, "");
    if (cleaned.length <= 3) return cleaned;
    if (cleaned.length <= 7)
      return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}-${cleaned.slice(7, 11)}`;
  };

  const validateContact = (contact: string) => {
    const cleaned = contact.replace(/[-\s]/g, "");
    if (cleaned.length === 0) {
      setContactError("");
      return true;
    }
    if (!cleaned.startsWith("010") && !cleaned.startsWith("011")) {
      setContactError("010 또는 011로 시작하는 번호를 입력해주세요");
      return false;
    }
    setContactError("");
    return true;
  };

  const formatBirthDate = (value: string) => {
    return value.replace(/[^0-9]/g, "").slice(0, 6);
  };

  const openAddressSearch = () => {
    if (typeof window !== "undefined" && window.daum) {
      new window.daum.Postcode({
        oncomplete: (data: KakaoPostcodeData) => {
          const addr = data.roadAddress || data.jibunAddress;
          setFormData((prev) => ({
            ...prev,
            address: addr,
            zonecode: data.zonecode,
          }));

          // 거주지 기반 실습 현황 분석 연출 (시/도 단위로 표시)
          const region = data.sido || addr.split(" ")[0];
          setRegionName(region);
          setRegionApplicants(getRegionApplicants(region));
          setRegionStatus("loading");
          if (regionTimerRef.current) clearTimeout(regionTimerRef.current);
          regionTimerRef.current = setTimeout(
            () => setRegionStatus("done"),
            2000,
          );
        },
      }).open();
    }
  };

  // 모든 필드 한번에 표시
  const showGender = true;
  const showContact = true;
  const showBirthDate = true;
  const showAddress = true;
  const showPracticeType = true;
  const showPayment = true;

  // 프로그레스 바 계산 (모든 항목 필수)
  const requiredChecks = [
    formData.name.trim().length > 0,
    formData.gender.length > 0,
    formData.contact.replace(/[-\s]/g, "").length >= 10 && !contactError,
    formData.birth_date.length >= 6,
    formData.address.length > 0,
    formData.address_detail.trim().length > 0,
    formData.desired_date.trim().length > 0,
    formData.practice_type.length > 0,
    formData.desired_weekday.trim().length > 0,
    formData.own_car.length > 0,
    // 유입경로를 고르는 링크는 담당자 성함 대신 알게 된 경로가 필수
    sourceMode ? formData.source.length > 0 : formData.manager.trim().length > 0,
    privacyAgreed,
    termsAgreed,
  ];
  const filledFields = requiredChecks.filter(Boolean).length;
  const totalFields = requiredChecks.length;
  const progress = (filledFields / totalFields) * 100;

  const isFormValid = requiredChecks.every(Boolean);

  const handleSubmit = async () => {
    if (!isFormValid) return;
    setLoading(true);
    try {
      const submitData = {
        name: formData.name,
        gender: formData.gender,
        contact: formData.contact,
        birth_date: formData.birth_date,
        address: formData.address,
        address_detail: formData.address_detail || null,
        zonecode: formData.zonecode || null,
        desired_date: formData.desired_date,
        desired_semester: "-",
        report_date: "-",
        practice_type: formData.practice_type,
        desired_weekday: formData.desired_weekday,
        own_car: formData.own_car,
        // 유입경로를 고르는 링크는 담당자를 비워 보낸다(오피스에서 지정)
        manager: sourceMode ? "" : formData.manager,
        source_mode: sourceMode,
        privacy_agreed: privacyAgreed,
        terms_agreed: termsAgreed,
        // 유입경로 — 유입경로를 고르는 링크는 신청자가 고른 경로(광고 표시 utm 이 붙어 있어도 고른 값이 남는다),
        // 그 밖의 링크는 광고 표시(utm)로 만든 값
        click_source:
          sourceMode && formData.source
            ? `실습섭외신청_${formData.source}`
            : clickSource,
      };

      const response = await fetch("/api/practice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submitData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "저장에 실패했습니다.");
      }

      const responseData = await response.json();

      // 결제 없는 버전 — 저장되면 바로 완료 화면
      void responseData;
      setStep(3);
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "저장에 실패했습니다. 다시 시도해주세요.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Script
        src="//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js"
        strategy="lazyOnload"
      />

      <div className={styles.container}>
        <header className={styles.header}>
          <div className={styles.logoContainer}>
            <Image
              src="/logo.png"
              alt="한평생그룹"
              width={130}
              height={34}
              className={styles.logo}
            />
          </div>
        </header>

        <AnimatePresence mode="wait">
          {/* STEP 2: 신청 폼 */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className={styles.stepWrapper}
            >
              {/* 프로그레스 바 */}
              <div className={styles.progressContainer}>
                <div className={styles.progressBarTrack}>
                  <div
                    className={styles.progressBarFill}
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className={styles.progressText}>{Math.round(progress)}%</p>
              </div>

              <div className={styles.step2Title}>
                <h1 className={styles.step2TitleText}>실습 섭외 신청</h1>
              </div>

              {/* 이름 */}
              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>
                  이름<span className={styles.required}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="이름을 입력해주세요"
                  className={styles.inputField}
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  autoFocus
                />
              </div>

              {/* 성별 */}
              {showGender && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={styles.inputGroup}
                >
                  <label className={styles.inputLabel}>
                    성별<span className={styles.required}>*</span>
                  </label>
                  <div className={styles.radioGroup}>
                    <label className={styles.radioLabel}>
                      <input
                        type="radio"
                        name="gender"
                        value="여"
                        checked={formData.gender === "여"}
                        onChange={(e) =>
                          setFormData({ ...formData, gender: e.target.value })
                        }
                        className={styles.radio}
                      />
                      <span>여성</span>
                    </label>
                    <label className={styles.radioLabel}>
                      <input
                        type="radio"
                        name="gender"
                        value="남"
                        checked={formData.gender === "남"}
                        onChange={(e) =>
                          setFormData({ ...formData, gender: e.target.value })
                        }
                        className={styles.radio}
                      />
                      <span>남성</span>
                    </label>
                  </div>
                </motion.div>
              )}

              {/* 연락처 */}
              {showContact && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={styles.inputGroup}
                >
                  <label className={styles.inputLabel}>
                    연락처<span className={styles.required}>*</span>
                  </label>
                  <input
                    type="tel"
                    placeholder="연락처를 입력해주세요"
                    className={styles.inputField}
                    value={formData.contact}
                    onChange={(e) => {
                      const formatted = formatContact(e.target.value);
                      setFormData({ ...formData, contact: formatted });
                      validateContact(formatted);
                    }}
                  />
                  {contactError && (
                    <p className={styles.errorMessage}>{contactError}</p>
                  )}
                </motion.div>
              )}

              {/* 생년월일 */}
              {showBirthDate && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={styles.inputGroup}
                >
                  <label className={styles.inputLabel}>
                    생년월일<span className={styles.required}>*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="생년월일 6자리를 입력(예: 730104)"
                    className={styles.inputField}
                    value={formData.birth_date}
                    maxLength={6}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        birth_date: formatBirthDate(e.target.value),
                      })
                    }
                  />
                </motion.div>
              )}

              {/* 거주지 */}
              {showAddress && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={styles.inputGroup}
                >
                  <label className={styles.inputLabel}>
                    거주지<span className={styles.required}>*</span>
                  </label>
                  <button
                    type="button"
                    className={styles.addressSearchBtn}
                    onClick={openAddressSearch}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <circle cx="11" cy="11" r="8" />
                      <path d="m21 21-4.35-4.35" />
                    </svg>
                    주소 검색
                  </button>
                  <input
                    type="text"
                    placeholder="거주지 주소를 검색해주세요"
                    className={styles.inputField}
                    value={formData.address}
                    readOnly
                    style={{ marginTop: 8, cursor: "pointer" }}
                    onClick={openAddressSearch}
                  />
                  {formData.address && (
                    <input
                      type="text"
                      placeholder="상세 주소를 입력해주세요 (동/호수 등)"
                      className={styles.inputField}
                      style={{ marginTop: 8 }}
                      value={formData.address_detail}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          address_detail: e.target.value,
                        })
                      }
                    />
                  )}
                  {regionStatus !== "idle" && (
                    <motion.div
                      key={regionStatus}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={styles.regionAnalysis}
                    >
                      {regionStatus === "loading" ? (
                        <>
                          <span className={styles.regionSpinner} />
                          <span>
                            {regionName} 실습 신청 현황 분석 중...
                          </span>
                        </>
                      ) : (
                        <span>
                          📍 {regionName} 사회복지사 실습 {regionApplicants}
                          /40명 사전신청완료
                        </span>
                      )}
                    </motion.div>
                  )}
                  <p className={styles.addressNote} style={{ color: "#6b7280" }}>
                    *학교/거주지 근처로 실습처 신청이 진행됩니다
                  </p>
                </motion.div>
              )}

              {/* 현장실습 희망날짜 */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={styles.inputGroup}
              >
                <label className={styles.inputLabel}>
                  현장실습 희망날짜<span className={styles.required}>*</span>
                </label>
                <div style={{ display: "flex", gap: 8 }}>
                  <select
                    className={styles.selectField}
                    style={{ flex: 1 }}
                    value={formData.desired_year}
                    onChange={(e) => {
                      const desired_year = e.target.value;
                      setFormData({
                        ...formData,
                        desired_year,
                        desired_date:
                          desired_year && formData.desired_month
                            ? `${desired_year} ${formData.desired_month}`
                            : "",
                      });
                    }}
                  >
                    <option value="">년도</option>
                    {DESIRED_YEAR_OPTIONS.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                  <select
                    className={styles.selectField}
                    style={{ flex: 1 }}
                    value={formData.desired_month}
                    onChange={(e) => {
                      const desired_month = e.target.value;
                      setFormData({
                        ...formData,
                        desired_month,
                        desired_date:
                          formData.desired_year && desired_month
                            ? `${formData.desired_year} ${desired_month}`
                            : "",
                      });
                    }}
                  >
                    <option value="">월</option>
                    {DESIRED_MONTH_OPTIONS.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
                <p className={styles.addressNote} style={{ color: "#6b7280" }}>
                  ※ 원하는 날짜로 알아보는데 부득이하게 실습생 모집하는 곳이
                  없다면
                  <br />
                  인근 지역으로 연계해드리거나 희망 월이 바뀔 수 있습니다
                </p>
              </motion.div>

              {/* 실습 진행시간 */}
              {showPracticeType && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={styles.inputGroup}
                >
                  <label className={styles.inputLabel}>
                    실습 진행시간<span className={styles.required}>*</span>
                  </label>
                  <select
                    className={styles.selectField}
                    value={formData.practice_type}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        practice_type: e.target.value,
                      })
                    }
                  >
                    <option value="">실습 진행시간을 선택하세요</option>
                    {PRACTICE_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                    {sourceMode && (
                      <option value={PRACTICE_TYPE_UNSURE}>잘 모르겠어요</option>
                    )}
                  </select>

                  {/* 실습 진행시간 안내 */}
                  <p
                    className={styles.addressNote}
                    style={{ color: "#6b7280" }}
                  >
                    {sourceMode ? (
                      <>
                        ※ 실습 진행시간을 잘 모르시면 「잘 모르겠어요」를
                        선택해 주세요
                        <br />
                        담당자가 확인 후 안내드립니다
                      </>
                    ) : (
                      <>
                        ※ 실습 진행시간은 담당자 꼭 확인 후 기입
                        부탁드립니다
                        <br />
                        담당자 통해 확인치 않고 기입에 따른 문제는 저희가
                        책임지지 않습니다
                      </>
                    )}
                  </p>
                </motion.div>
              )}

              {/* 실습 진행일 */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={styles.inputGroup}
              >
                <label className={styles.inputLabel}>
                  실습 진행일<span className={styles.required}>*</span>
                </label>
                <select
                  className={styles.selectField}
                  value={formData.desired_weekday}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      desired_weekday: e.target.value,
                    })
                  }
                >
                  <option value="">실습 진행일을 선택하세요</option>
                  {WEEKDAY_OPTIONS.map((w) => (
                    <option key={w} value={w}>
                      {w}
                    </option>
                  ))}
                </select>
              </motion.div>

              {/* 자차 사용 여부 */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={styles.inputGroup}
              >
                <label className={styles.inputLabel}>
                  자차 사용 여부<span className={styles.required}>*</span>
                </label>
                <div className={styles.radioGroup}>
                  <label className={styles.radioLabel}>
                    <input
                      type="radio"
                      name="own_car"
                      value="O"
                      checked={formData.own_car === "O"}
                      onChange={(e) =>
                        setFormData({ ...formData, own_car: e.target.value })
                      }
                      className={styles.radio}
                    />
                    <span>사용 (O)</span>
                  </label>
                  <label className={styles.radioLabel}>
                    <input
                      type="radio"
                      name="own_car"
                      value="X"
                      checked={formData.own_car === "X"}
                      onChange={(e) =>
                        setFormData({ ...formData, own_car: e.target.value })
                      }
                      className={styles.radio}
                    />
                    <span>미사용 (X)</span>
                  </label>
                </div>
              </motion.div>

              {/* 담당자 성함 */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={styles.inputGroup}
              >
                {sourceMode ? (
                  <>
                    <label className={styles.inputLabel}>
                      알게 된 경로<span className={styles.required}>*</span>
                    </label>
                    <select
                      className={styles.selectField}
                      value={formData.source}
                      onChange={(e) =>
                        setFormData({ ...formData, source: e.target.value })
                      }
                    >
                      <option value="">선택해주세요</option>
                      {SOURCE_OPTIONS.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  </>
                ) : (
                  <>
                    <label className={styles.inputLabel}>
                      담당자 성함<span className={styles.required}>*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="담당자 성함을 입력해주세요"
                      className={styles.inputField}
                      value={formData.manager}
                      onChange={(e) =>
                        setFormData({ ...formData, manager: e.target.value })
                      }
                    />
                  </>
                )}
              </motion.div>

              {/* 동의 + 신청 버튼 */}
              {showPayment && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className={styles.agreementSection}>
                    <label className={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={privacyAgreed}
                        onChange={(e) => setPrivacyAgreed(e.target.checked)}
                        className={styles.checkbox}
                      />
                      <span>
                        <button
                          type="button"
                          onClick={() => setShowPrivacyModal(true)}
                          className={styles.agreementLink}
                        >
                          개인정보처리방침
                        </button>{" "}
                        동의{" "}
                        <span className={styles.requiredBadge}>(필수)</span>
                      </span>
                    </label>

                    <label className={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={termsAgreed}
                        onChange={(e) => setTermsAgreed(e.target.checked)}
                        className={styles.checkbox}
                      />
                      <span>
                        <button
                          type="button"
                          onClick={() => setShowTermsModal(true)}
                          className={styles.agreementLink}
                        >
                          이용약관
                        </button>{" "}
                        동의{" "}
                        <span className={styles.requiredBadge}>(필수)</span>
                      </span>
                    </label>
                  </div>

                  <button
                    className={styles.bottomButton}
                    disabled={!isFormValid || loading}
                    onClick={handleSubmit}
                  >
                    {loading ? "처리 중..." : "신청하기"}
                  </button>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* STEP 3: 완료 화면 */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className={`${styles.stepWrapper} ${styles.step3Container}`}
            >
              <Image
                src="/complete-check.png"
                alt="Done"
                width={300}
                height={300}
                priority
                className={styles.step3Image}
              />
              <h1 className={styles.title}>
                실습 섭외 신청이{"\n"}정상적으로{"\n"}접수되었습니다.
              </h1>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 개인정보처리방침 모달 */}
        {showPrivacyModal && (
          <div
            className={styles.modalOverlay}
            onClick={() => setShowPrivacyModal(false)}
          >
            <div
              className={styles.modalPrivacy}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.modalPrivacyHeader}>
                <h3 className={styles.modalPrivacyTitle}>개인정보처리방침</h3>
                <button
                  className={styles.modalCloseButton}
                  onClick={() => setShowPrivacyModal(false)}
                  aria-label="닫기"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <path
                      d="M18 6L6 18M6 6L18 18"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>
              <div className={styles.modalPrivacyContent}>
                <div className={styles.modalPrivacyScroll}>
                  <p className={styles.modalPrivacyItem}>
                    <strong>1. 개인정보 수집 및 이용 목적</strong>
                    실습 섭외 신청 처리, 실습처 배정 안내 및 문의사항
                    응대. 개인정보는 서비스 제공을 위한 목적으로만 수집 및
                    이용되며, 동의 없이 제3자에게 제공되지 않습니다.
                  </p>
                  <p className={styles.modalPrivacyItem}>
                    <strong>2. 수집 및 이용하는 개인정보 항목</strong>
                    필수 - 이름, 성별, 연락처, 생년월일, 거주지(상세주소 포함),
                    현장실습 희망날짜, 실습 진행시간, 실습 진행일,
                    자차 사용 여부, {sourceMode ? "알게 된 경로" : "담당자 성함"}
                  </p>
                  <p className={styles.modalPrivacyItem}>
                    <strong>3. 보유 및 이용 기간</strong>
                    법령이 정하는 경우를 제외하고는 수집일로부터 1년 또는 동의
                    철회 시까지 보유 및 이용합니다.
                  </p>
                  <p className={styles.modalPrivacyItem}>
                    <strong>4. 동의 거부 권리</strong>
                    신청자는 동의를 거부할 권리가 있습니다. 단, 필수 항목에 대한
                    동의를 거부하는 경우 서비스 이용이 제한됩니다. 선택 항목에
                    대한 동의를 거부하더라도 서비스 이용에는 제한이 없습니다.
                  </p>
                  <p className={styles.modalPrivacyItem}>
                    <strong>5. 개인정보의 제3자 제공</strong>
                    회사는 원칙적으로 이용자의 개인정보를 제3자에게 제공하지
                    않습니다. 다만, 실습처 배정을 위해 해당 실습기관에 필요한
                    최소한의 정보(이름, 연락처, 실습유형)를 제공할 수 있으며, 이
                    경우 사전에 안내드립니다.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 이용약관 모달 */}
        {showTermsModal && (
          <div
            className={styles.modalOverlay}
            onClick={() => setShowTermsModal(false)}
          >
            <div
              className={styles.modalPrivacy}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.modalPrivacyHeader}>
                <h3 className={styles.modalPrivacyTitle}>이용약관</h3>
                <button
                  className={styles.modalCloseButton}
                  onClick={() => setShowTermsModal(false)}
                  aria-label="닫기"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <path
                      d="M18 6L6 18M6 6L18 18"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>
              <div className={styles.modalPrivacyContent}>
                <div className={styles.modalPrivacyScroll}>
                  <p className={styles.modalPrivacyItem}>
                    <strong>제1조 (목적)</strong>본 약관은 한평생그룹(이하
                    &quot;회사&quot;)이 제공하는 실습 섭외 신청 서비스의 이용
                    조건 및 절차에 관한 사항을 규정합니다.
                  </p>
                  <p className={styles.modalPrivacyItem}>
                    <strong>제2조 (서비스 내용)</strong>
                    회사는 사회복지사, 보육교사, 평생교육사, 한국어교원 등 자격
                    취득을 위한 실습 섭외 및 배정 서비스를 제공합니다.
                  </p>
                  <p className={styles.modalPrivacyItem}>
                    <strong>제3조 (이용자의 의무)</strong>
                    이용자는 신청 시 정확한 정보를 입력해야 하며, 허위 정보
                    입력으로 발생하는 불이익에 대해 회사는 책임지지 않습니다.
                  </p>
                  <p className={styles.modalPrivacyItem}>
                    <strong>제4조 (서비스 변경 및 중단)</strong>
                    회사는 운영상, 기술상의 필요에 따라 서비스를 변경하거나
                    중단할 수 있으며, 이 경우 사전에 공지합니다.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </>
  );
}

export default function Page() {
  const [clickSource, setClickSource] = useState("");
  const handleSourceChange = useCallback((source: string) => {
    setClickSource(source);
  }, []);
  const [sourceMode, setSourceMode] = useState(false);

  return (
    <Suspense fallback={<div />}>
      <ClickSourceHandler
        onSourceChange={handleSourceChange}
        onModeChange={setSourceMode}
      />
      <PracticeFormContent clickSource={clickSource} sourceMode={sourceMode} />
    </Suspense>
  );
}
