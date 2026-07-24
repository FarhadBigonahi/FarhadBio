"use client";

import Image from "next/image";
import { useRef } from "react";
import { motion, useScroll, useTransform } from "motion/react";

type Props = {
  src: string;
  alt: string;
  sizes?: string;
  quality?: number;
  objectPosition?: string;
  /** px of vertical parallax drift (image moves up as you scroll past) */
  amount?: number;
  /** persistent zoom that gives the drift room without exposing edges */
  scale?: number;
  priority?: boolean;
};

/**
 * A `fill` image with Framer-style scroll parallax: the image is held at a
 * slight scale and drifts vertically as its container passes through the
 * viewport. Fills its nearest positioned ancestor.
 */
export default function ParallaxImage({
  src,
  alt,
  sizes,
  quality = 85,
  objectPosition = "center",
  amount = 40,
  scale = 1.16,
  priority = false,
}: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], [amount, -amount]);

  return (
    <div ref={ref} className="parallax-fill">
      <motion.div className="parallax-fill__inner" style={{ y, scale }}>
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          quality={quality}
          priority={priority}
          style={{ objectFit: "cover", objectPosition }}
        />
      </motion.div>
    </div>
  );
}
