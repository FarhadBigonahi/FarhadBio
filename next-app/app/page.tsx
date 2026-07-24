import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Intro from "@/components/Intro";
import About from "@/components/About";
import Skills from "@/components/Skills";
import Review from "@/components/Review";
import Experience from "@/components/Experience";
import Certification from "@/components/Certification";
import Cta from "@/components/Cta";
import Footer from "@/components/Footer";
import { personJsonLd } from "@/lib/seo";

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
        <Cta />
      </main>
      <Footer />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd()) }}
      />
    </>
  );
}
