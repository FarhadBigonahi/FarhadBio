import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Intro from "@/components/Intro";
import About from "@/components/About";
import Skills from "@/components/Skills";
import Review from "@/components/Review";
import Experience from "@/components/Experience";
import Certification from "@/components/Certification";
import LatestPosts from "@/components/LatestPosts";
import Cta from "@/components/Cta";
import Footer from "@/components/Footer";
import { jsonLd, personJsonLd, profilePageJsonLd, webSiteJsonLd } from "@/lib/seo";

// The Latest Insights section reads posts, so the homepage revalidates on the
// same cadence as the blog — a new post appears here without a redeploy.
export const revalidate = 60;

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <Intro />
        <About />
        <Skills />
        <Review />
        <Experience />
        <Certification />
        <LatestPosts />
        <Cta />
      </main>
      <Footer />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLd([
          personJsonLd(),
          webSiteJsonLd(),
          profilePageJsonLd(),
        ])}
      />
    </>
  );
}
