"use client";

import Image from "next/image";
import { motion, useScroll, useTransform, type Variants } from "motion/react";

const EASE: [number, number, number, number] = [0.22, 0.61, 0.36, 1];
const HERO_SRC = "/images/GfwTTKguFBeDrqBfGiEynuxsHMI.png";

const services: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.55 } },
};
const service: Variants = {
  hidden: { opacity: 0, x: 24, filter: "blur(8px)" },
  show: {
    opacity: 1,
    x: 0,
    filter: "blur(0px)",
    transition: { duration: 0.8, ease: EASE },
  },
};

export default function Hero() {
  // Subtle scroll parallax on the background image (scale only — never gaps).
  const { scrollY } = useScroll();
  const bgScale = useTransform(scrollY, [0, 900], [1, 1.12]);

  return (
    <section className="hero">
      <motion.div className="hero__bg" style={{ scale: bgScale }}>
        <Image
          src={HERO_SRC}
          alt=""
          fill
          priority
          sizes="100vw"
          quality={88}
          style={{ objectFit: "cover", objectPosition: "50% 0%" }}
        />
      </motion.div>
      <div className="hero__overlay" aria-hidden="true" />

      <div className="hero__inner">
        <motion.div
          className="hero__services"
          variants={services}
          initial="hidden"
          animate="show"
        >
          <motion.span variants={service}>Brand Identity</motion.span>
          <motion.span variants={service}>UI/UX Design</motion.span>
          <motion.span variants={service}>Web Development</motion.span>
        </motion.div>

        <motion.p
          className="hero__eyebrow"
          initial={{ opacity: 0, y: 24, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.8, ease: EASE, delay: 0.15 }}
        >
          Code that drives impact.
        </motion.p>

        <motion.h1
          className="hero__wordmark"
          initial={{ opacity: 0, y: 34, filter: "blur(14px)", scale: 0.98 }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)", scale: 1 }}
          transition={{ duration: 1, ease: EASE, delay: 0.28 }}
        >
          Farhad<span className="reg">®</span>
        </motion.h1>

        <motion.div
          className="hero__frame"
          initial={{ opacity: 0, y: 26, filter: "blur(10px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.9, ease: EASE, delay: 0.45 }}
        >
          <Image
            src={HERO_SRC}
            alt="Farhad Bigonahi in an infinity pool overlooking the Dubai skyline"
            width={1600}
            height={1000}
            sizes="(max-width: 860px) 78vw, 300px"
            quality={88}
          />
        </motion.div>
      </div>
    </section>
  );
}
