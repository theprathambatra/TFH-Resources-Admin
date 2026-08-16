import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Catalogue from "@/components/Catalogue";
import styles from "@/components/ResourcesHome.module.css";
import { getProducts } from "@/lib/products";

export const dynamic = "force-dynamic";

const exams = [
  {
    name: "TEF",
    copy: "Focused practice for learners preparing for TEF Canada and ambitious score targets."
  },
  {
    name: "TCF",
    copy: "Clear, exam-aware material to help you understand the format and practise with purpose."
  },
  {
    name: "DELF",
    copy: "Level-based resources for learners building strong French from A1 through B2."
  }
];

export default async function Home() {
  const products = await getProducts();
  const mainSite = process.env.NEXT_PUBLIC_MAIN_SITE_URL || "#";

  return (
    <>
      <Header />
      <main className={styles.home}>
        <section className={styles.hero}>
          <div>
            <div className={styles.heroKicker}>The Français Hub · Digital Resources</div>
            <h1 className={styles.heroTitle}>
              French, beyond <em>the classroom.</em>
            </h1>
          </div>
          <div className={styles.heroSide}>
            <p className={styles.heroCopy}>
              Curated study material by Yana for TEF, TCF and DELF — made for learners
              who want direction, clarity and better practice without the noise.
            </p>
            <div className={styles.heroNote}>Made to support real learning, not endless downloading.</div>
          </div>
        </section>

        <section className={styles.examSection} id="exam-paths">
          <div className={styles.sectionLabel}>Start with your goal</div>
          <div className={styles.sectionIntro}>
            <h2>What are you preparing for?</h2>
            <p>
              Choose your exam path first. You can still browse the full collection below,
              but this is the fastest way to find material built around your objective.
            </p>
          </div>

          <div className={styles.examGrid}>
            {exams.map((exam, index) => (
              <a className={styles.examCard} key={exam.name} href={`#collection-${exam.name.toLowerCase()}`}>
                <div>
                  <div className={styles.examNo}>0{index + 1}</div>
                  <div className={styles.examName}>{exam.name}</div>
                  <p>{exam.copy}</p>
                </div>
                <span className={styles.examArrow}>↗</span>
              </a>
            ))}
          </div>
        </section>

        <section className={styles.story}>
          <div className={styles.storyInner}>
            <div>
              <div className={styles.storyEyebrow}>The TFH approach</div>
              <h2 className={styles.storyHeading}>
                Less material. <em>Better practice.</em>
              </h2>
            </div>

            <div className={styles.storyList}>
              <div className={styles.storyItem}>
                <span className={styles.storyIndex}>01</span>
                <div>
                  <strong>Built with a purpose.</strong>
                  <p>Every resource is designed around a skill, exam need or recurring learner problem.</p>
                </div>
              </div>
              <div className={styles.storyItem}>
                <span className={styles.storyIndex}>02</span>
                <div>
                  <strong>Designed to be usable.</strong>
                  <p>Clear structure, focused prompts and practical exercises — not pages added for volume.</p>
                </div>
              </div>
              <div className={styles.storyItem}>
                <span className={styles.storyIndex}>03</span>
                <div>
                  <strong>Connected to real teaching.</strong>
                  <p>Created from the same learning philosophy Yana brings into The Français Hub classroom.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <Catalogue products={products} />

        <section className={styles.closing}>
          <div>
            <div className={styles.sectionLabel}>Want more than a resource?</div>
            <h2 className={styles.closingTitle}>Learn with Yana.</h2>
          </div>
          <div className={styles.closingSide}>
            <p>
              Explore personalised French learning, exam preparation and the complete
              The Français Hub experience beyond self-study resources.
            </p>
            <a className={styles.mainSiteLink} href={mainSite}>Explore The Français Hub <span>↗</span></a>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
