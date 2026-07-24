import Image from "next/image";
import Reveal from "./Reveal";

const PHRASES = Array.from({ length: 8 }, (_, i) => i);

export default function Cta() {
  return (
    <section className="cta" id="contact">
      <div className="cta__stage">
        <div className="cta__marquee" aria-hidden="true">
          <div className="cta__track">
            {[...PHRASES, ...PHRASES].map((_, i) => (
              <span key={i}>Get in touch.</span>
            ))}
          </div>
        </div>

        <Reveal as="div" className="cta__image" delay={80}>
          <Image
            src="/images/b9UGt2D4H6kmk5D4ahq8DNIM.png"
            alt="Person walking through a neon-lit DIOR corridor"
            width={1200}
            height={1600}
            sizes="(max-width: 860px) 60vw, 330px"
            quality={85}
          />
        </Reveal>
      </div>

      <Reveal delay={180}>
        <a className="cta__contact" href="mailto:business@farhad.bio">
          Contact Us
        </a>
      </Reveal>
    </section>
  );
}
