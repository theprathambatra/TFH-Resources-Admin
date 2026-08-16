"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

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
    <>
      <section className="site-shell catalogue-head">
        <h2>Explore the collection.</h2>
        <div className="filters" aria-label="Resource filters">
          {categories.map(category => (
            <button
              className={`filter ${filter === category ? "active" : ""}`}
              key={category}
              onClick={() => setFilter(category)}
            >
              {category}
            </button>
          ))}
        </div>
      </section>

      <section className="site-shell grid">
        {visible.map(product => (
          <article className="card" key={product.id}>
            <Link href={`/resources/${product.slug}`}>
              <div className="cover-wrap">
                <img src={product.cover_path || "/covers/default.svg"} alt="" />
              </div>
            </Link>
            <div className="card-meta">
              {[product.category, product.skill, product.level].filter(Boolean).join(" · ")}
            </div>
            <h3><Link href={`/resources/${product.slug}`}>{product.title}</Link></h3>
            <p>{product.short_description}</p>
            <div className="card-bottom">
              <span className="price">{formatINR(product.price_paise)}</span>
              <Link className="text-link" href={`/resources/${product.slug}`}>View resource →</Link>
            </div>
          </article>
        ))}
      </section>
    </>
  );
}
