import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Catalogue from "@/components/Catalogue";
import { getProducts } from "@/lib/products";

export const dynamic = "force-dynamic";

export default async function Home() {
  const products = await getProducts();

  return (
    <>
      <Header />
      <main>
        <section className="site-shell hero">
          <div>
            <div className="eyebrow">The Français Hub · Digital Resources</div>
            <h1>French, with intention.</h1>
          </div>
          <p className="hero-copy">
            Focused guides, practice material and exam resources designed for learners
            who want structure—not noise. Built for TEF, TCF, DELF and everyday French.
          </p>
        </section>

        <Catalogue products={products} />
      </main>
      <Footer />
    </>
  );
}
