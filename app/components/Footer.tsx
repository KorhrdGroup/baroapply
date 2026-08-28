"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./Footer.module.css";

export default function Footer() {
  const pathname = usePathname();

  // 관리자 페이지에서는 푸터 숨기기
  if (pathname?.startsWith("/admin")) {
    return null;
  }

  return (
    <footer className={styles.footer}>
      <div className={styles.footerContent}>
        <div className={styles.footerLogo}>
          <span className={styles.logoText}>
            <img src="/logo.png" alt="BaroCompany Logo" />
          </span>
        </div>

        <div className={styles.footerInfo}>
          <p className={styles.infoLine}>
            대표 양병웅 | 사업자등록번호 227-88-03196
          </p>
          <p className={styles.infoLine}>
            서울시 도봉구 창동 마들로13길 61 씨드큐브 905호
          </p>
          <div className={styles.footerLinks}>
            <Link href="/terms" className={styles.footerLink}>
              이용약관
            </Link>
            <span className={styles.divider}>|</span>
            <Link href="/privacy" className={styles.footerLink}>
              개인정보처리방침
            </Link>
          </div>
          <p className={styles.copyright}>
            2026 © KorhrdGroup. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
