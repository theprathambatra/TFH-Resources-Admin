"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import styles from "./ResourcesHome.module.css";

function formatINR(paise) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format((paise || 0) / 100);
}

export default function Catalogue({ products }) {
  const [filter, setFilter] = useState("All");
  const categories = ["All", ...Array.from(new Set(products.map(p => p.category).filter(Boolean)))];

  const visible = useMemo(() => {
    if (filter === "All") return products;
    return products.filter(p => p.category === filter);
  }, [filter, products]);

  return (
    <section id="collection">
      <div className={styles.catalogueHead}>
        <div>
          <div className={styles.sectionLabel}>The collection</div>
          <h2 className={styles.catalogueTitle}>Choose what helps next.</h2>
        </div>

        <div className={styles.filters} aria-label="Resource filters">
          {categories.map(category => (
            <button
              className={`${styles.filter} ${filter === category ? styles.filterActive : ""}`}
              key={category}
              onClick={() => setFilter(category)}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {visible.length > 0 ? (
        <div className={styles.grid}>
          {visible.map(product => (
            <article className={styles.card} key={product.id}>
              <Link className={styles.coverLink} href={`/resources/${product.slug}`}>
                <div className={styles.coverWrap}>
                  <img src={product.cover_path || "/covers/default.svg"} alt="" />
                </div>
              </Link>
              <div className={styles.cardMeta}>
                {[product.category, product.skill, product.level].filter(Boolean).join(" · ")}
              </div>
              <h3><Link href={`/resources/${product.slug}`}>{product.title}</Link></h3>
              <p>{product.short_description}</p>
              <div className={styles.cardBottom}>
                <span className={styles.price}>{formatINR(product.price_paise)}</span>
                <Link className={styles.resourceLink} href={`/resources/${product.slug}`}>View resource →</Link>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className={styles.emptyState}>No resources are published in this category yet.</div>
      )}
    </section>
  );
}
