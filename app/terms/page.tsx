'use client';

import Link from 'next/link';
import styles from './terms.module.css';
import { termsData } from './termsData';

export default function TermsPage() {
  return (
    <div className={styles.termsContainer}>
      <div className={styles.termsHeader}>
        <Link href="/" className={styles.backLink}>← 홈으로</Link>
        <h1>이용약관</h1>
      </div>
      
      <div className={styles.termsContent}>
        {termsData.map((item) => (
          <section key={item.id} className={styles.termsSection}>
            <h2>{item.title}</h2>
            <p style={{ whiteSpace: 'pre-line' }}>{item.content}</p>
          </section>
        ))}

        <section className={styles.termsSection}>
          <p className={styles.effectiveDate}>시행일자: 2026년 1월 29일</p>
        </section>
      </div>
    </div>
  );
}
