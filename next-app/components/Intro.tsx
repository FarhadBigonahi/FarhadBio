"use client";

import Image from "next/image";
import { useRef } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import Reveal from "./Reveal";

const NEON = "/images/b9UGt2D4H6kmk5D4ahq8DNIM.png";
const BOAT = "/images/9qB2nXGZizL2NDEULFBJosHCY.png";

export default function Intro() {
  const ref = useRef<HTMLElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  // Diagonal parallax: the two flanking images drift at different rates.
  const yLeft = useTransform(scrollYProgress, [0, 1], [90, -90]);
  const yRight = useTransform(scrollYProgress, [0, 1], [150, -150]);

  return (
    <section className="intro" ref={ref}>
      <motion.figure
        className="intro__media intro__media--left"
        style={{ y: yLeft }}
        aria-hidden="true"
      >
        <Image
          src={NEON}
          alt=""
          width={900}
          height={1150}
          sizes="(max-width: 860px) 42vw, 430px"
          quality={82}
        />
      </motion.figure>

      <motion.figure
        className="intro__media intro__media--right"
        style={{ y: yRight }}
        aria-hidden="true"
      >
        <Image
          src={BOAT}
          alt=""
          width={1200}
          height={1500}
          sizes="(max-width: 860px) 42vw, 430px"
          quality={82}
        />
      </motion.figure>

      <Reveal as="p" className="intro__text">
        I build fast, reliable software end to end, from C# back-ends to React
        front-ends, and now with AI at the core.
      </Reveal>
    </section>
  );
}
