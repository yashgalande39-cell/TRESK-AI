import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, ArrowRight } from "lucide-react";
import { Magnetic } from "../fx/Magnetic";

const EASE = [0.22, 1, 0.36, 1];
const links = ["Features", "How It Works", "Testimonials"];

export function LandingNavbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.header
      initial={{ y: -80, opacity: 0, filter: "blur(12px)" }}
      animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
      transition={{ duration: 1, ease: EASE, delay: 0.2 }}
      className="lp-navbar-wrapper"
    >
      <nav className={`lp-navbar ${scrolled ? "lp-navbar-scrolled" : ""}`}>
        <motion.a
          href="/"
          className="lp-brand"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.7, ease: EASE, delay: 0.4 }}
        >
          <span className="lp-brand-icon">
            <Sparkles size={20} color="white" />
          </span>
          <span className="lp-brand-text">INTERVIEW AI</span>
        </motion.a>

        <motion.ul
          className="lp-nav-links"
          initial="hidden"
          animate="show"
          variants={{ show: { transition: { staggerChildren: 0.07, delayChildren: 0.5 } } }}
        >
          {links.map((l) => {
            const id = l.toLowerCase().replace(/\s+/g, "-");
            return (
              <motion.li
                key={l}
                variants={{ hidden: { opacity: 0, y: -10 }, show: { opacity: 1, y: 0 } }}
              >
                <a href={`#${id}`} className="lp-nav-link">{l}</a>
              </motion.li>
            );
          })}
        </motion.ul>

        <motion.div
          className="lp-nav-actions"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, ease: EASE, delay: 0.7 }}
        >
          <a href="/login" className="lp-btn-ghost">Log in</a>
          <Magnetic strength={0.4}>
            <a href="/register" className="lp-btn-primary lp-btn-pulse">
              <span className="lp-btn-pulse-ring" />
              <span className="lp-relative-z">Start Mock Interview</span>
              <ArrowRight size={16} className="lp-relative-z lp-icon-slide" />
            </a>
          </Magnetic>
        </motion.div>
      </nav>
    </motion.header>
  );
}
