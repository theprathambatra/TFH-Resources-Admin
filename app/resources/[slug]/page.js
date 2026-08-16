import { notFound } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CheckoutBox from "@/components/CheckoutBox";
import { getProductBySlug } from "@/lib/products";

export const dynamic = "force-dynamic";

function formatINR(paise) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format((paise || 0) / 100);
}

export default async function ProductPage({ params }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  return (
    <>
      <Header />
      <main className="site-shell product">
        <div className="product-cover">
          <img src={product.cover_path || "/covers/default.svg"} alt={`${product.title} cover`} />
        </div>

        <div>
          <div className="eyebrow">
            {[product.category, product.skill, product.level].filter(Boolean).join(" · ")}
          </div>
          <h1 className="product-title">{product.title}</h1>
          <p className="product-lede">{product.description || product.short_description}</p>

          <div className="product-price">{formatINR(product.price_paise)}</div>

          <div className="eyebrow">What’s inside</div>
          <ul className="includes">
            {(product.includes || []).map(item => <li key={item}>{item}</li>)}
          </ul>

          <CheckoutBox product={product} />
          <a className="back" href="/">← Back to all resources</a>
        </div>
      </main>
      <Footer />
    </>
  );
}
