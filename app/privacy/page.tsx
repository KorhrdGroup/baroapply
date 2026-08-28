'use client';

import Link from 'next/link';
import styles from './privacy.module.css';
import { privacyData } from './privacyData';

export default function PrivacyPage() {
  return (
    <div className={styles.privacyContainer}>
      <div className={styles.privacyHeader}>
        <Link href="/" className={styles.backLink}>← 홈으로</Link>
        <h1>개인정보처리방침</h1>
      </div>
      
      <div className={styles.privacyContent}>
        {privacyData.map((item) => (
          <section key={item.id} className={styles.privacySection}>
            <h2>{item.title}</h2>
            <p style={{ whiteSpace: 'pre-line' }}>{item.content}</p>
          </section>
        ))}

        <section className={styles.privacySection}>
          <p className={styles.effectiveDate}>
            <strong>공고일자:</strong> 2026년 1월 29일<br />
            <strong>시행일자:</strong> 2026년 1월 29일
          </p>
        </section>
      </div>
    </div>
  );
}
