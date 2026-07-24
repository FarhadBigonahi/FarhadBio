"use client";

import { useState } from "react";
import Image from "next/image";
import Reveal from "./Reveal";
import Lightbox from "./Lightbox";

const CERT_SRC = "/images/certificate-aspnet.jpg";
const CERT_ALT =
  "ASP.NET certificate awarded to Farhad Bigonahi by Santa Monica Certification, Dubai";

export default function Certification() {
  const [open, setOpen] = useState(false);

  return (
    <section className="fx-section fx-certs">
      <div className="fx-container">
        <h2 className="fx-title">Certification</h2>
        <p className="fx-sub">Verified training credential</p>

        <div className="fx-certgrid">
          <Reveal className="fx-cert fx-cert--photo">
            <button
              type="button"
              className="fx-cert-thumb"
              onClick={() => setOpen(true)}
              aria-label="View the ASP.NET certificate"
            >
              <Image
                src={CERT_SRC}
                alt={CERT_ALT}
                fill
                sizes="(max-width: 620px) 90vw, 300px"
                quality={90}
                style={{ objectFit: "cover" }}
              />
              <span className="fx-cert-zoom" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none">
                  <circle
                    cx="11"
                    cy="11"
                    r="7"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                  <path
                    d="M20 20l-3.2-3.2M11 8v6M8 11h6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
            </button>

            <div className="fx-cert-body">
              <span className="fx-cert-badge" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none">
                  <circle
                    cx="12"
                    cy="9"
                    r="6"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                  <path
                    d="M8.5 14.5L7 22l5-2.5L17 22l-1.5-7.5"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <h3 className="fx-cert-title">ASP.NET Certification</h3>
              <p className="fx-cert-org">
                Santa Monica Certification (SMC) &middot; Dubai
              </p>
              <p className="fx-cert-meta">Sep &ndash; Oct 2023 &middot; 130 hours</p>
              <button
                type="button"
                className="fx-cert-view"
                onClick={() => setOpen(true)}
              >
                View certificate
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M7 17L17 7M9 7h8v8"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
          </Reveal>
        </div>
      </div>

      <Lightbox
        src={CERT_SRC}
        alt={CERT_ALT}
        open={open}
        onClose={() => setOpen(false)}
      />
    </section>
  );
}
