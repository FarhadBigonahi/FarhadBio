import Reveal from "./Reveal";
import ParallaxImage from "./ParallaxImage";

export default function About() {
  return (
    <section className="about" id="about">
      <div className="container">
        <Reveal as="h2" className="about__heading">
          About
        </Reveal>

        <Reveal as="figure" className="about__media">
          <ParallaxImage
            src="/images/BwTaIWn2N6Ts5RqZTfqDPBYYw.png"
            alt="Farhad Bigonahi at an infinity pool overlooking the Dubai skyline"
            sizes="(max-width: 860px) 88vw, 440px"
            amount={24}
            scale={1.2}
          />
        </Reveal>

        <Reveal as="p" className="about__text" delay={60}>
          I&rsquo;m Farhad Bigonahi, a full-stack developer who has been building
          software professionally since 2016. C# is my home turf, from the
          database all the way to the interface, with React and Node.js on the
          web and ASP.NET and NestJS behind the APIs. I&rsquo;ve shipped
          production systems for teams like FlyToday, TopLearn, and
          Barnamenevisan, but from day one my real goal was to build my own
          products and turn my own ideas into businesses. When AI-first
          &lsquo;vibe coding&rsquo; arrived, I went all in on it, and today I
          also teach it, finally passing on what I know after eight years in the
          craft.
        </Reveal>

        <Reveal className="about__stats" delay={120}>
          <div className="about__stat">
            <div className="about__stat-num">8+</div>
            <div className="about__stat-label">Years Experience</div>
          </div>
          <div className="about__stat about__stat--end">
            <div className="about__stat-num">100%</div>
            <div className="about__stat-label">Perfectionist</div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
