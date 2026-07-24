import Reveal from "./Reveal";
import ParallaxImage from "./ParallaxImage";

export default function Review() {
  return (
    <section className="review">
      <div className="review__inner">
        <Reveal className="review__text">
          <div className="review__stars" role="img" aria-label="Rated 5 out of 5">
            <span aria-hidden="true">★</span>
            <span aria-hidden="true">★</span>
            <span aria-hidden="true">★</span>
            <span aria-hidden="true">★</span>
            <span aria-hidden="true">★</span>
          </div>
          <p className="review__quote">
            &ldquo;I don&rsquo;t ship anything I&rsquo;m not proud of. I keep
            most of my time for my own products, so I take on very few outside
            projects, but the right one can always change my mind. Perfectionism
            isn&rsquo;t a phase for me; it&rsquo;s the standard.&rdquo;
          </p>
          <p className="review__name">Farhad Bigonahi</p>
          <p className="review__role">Full-Stack Developer &middot; AI Builder</p>
        </Reveal>
      </div>

      <Reveal as="div" className="review__media">
        <ParallaxImage
          src="/images/ydOiNMh5TzE424sVceqPUFGrR50.png"
          alt="Farhad Bigonahi standing in front of an illuminated DIOR storefront"
          sizes="(max-width: 900px) 92vw, 50vw"
          amount={44}
          scale={1.16}
        />
      </Reveal>
    </section>
  );
}
