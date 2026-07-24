import Reveal from "./Reveal";

const ROWS = [
  { num: "01", title: "promall.io", role: "My Startup · Full-Stack", year: "2025" },
  { num: "02", title: "FlyToday", role: "Full-Stack Developer", year: "2025" },
  { num: "03", title: "TopLearn", role: "Web · API Developer", year: "2024" },
  { num: "04", title: "Barnamenevisan", role: "Full-Stack Developer", year: "2024" },
];

export default function Experience() {
  return (
    <section className="experience">
      <div className="container">
        <Reveal as="h2" className="experience__heading">
          Experience
        </Reveal>
        <div>
          {ROWS.map((r, i) => (
            <Reveal className="exp-row" key={r.num} delay={i * 60}>
              <span className="exp-row__num">{r.num}</span>
              <div>
                <h3 className="exp-row__title">{r.title}</h3>
                <p className="exp-row__role">{r.role}</p>
              </div>
              <span className="exp-row__year">{r.year}</span>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
