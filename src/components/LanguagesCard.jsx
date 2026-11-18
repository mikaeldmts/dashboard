import { motion } from "framer-motion";
import { Globe } from "lucide-react";
import { SPOKEN_LANGUAGES } from "../lib/constants.js";

const listVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.05
    }
  }
};

const rowVariants = {
  hidden: { opacity: 0, x: -8 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] }
  }
};

export function LanguagesCard({ variants }) {
  return (
    <motion.section className="card langs-card" variants={variants}>
      <div className="section-head">
        <div className="section-title-group">
          <Globe size={16} className="section-icon" aria-hidden="true" />
          <h2>Idiomas</h2>
        </div>
      </div>

      <motion.div className="langs-grid" variants={listVariants}>
        {SPOKEN_LANGUAGES.map((lang) => (
          <motion.div
            key={lang.name}
            className="lang-item"
            variants={rowVariants}
            whileHover={{ x: 4 }}
            transition={{ duration: 0.18 }}
          >
            <span className="lang-flag" aria-hidden="true">
              {lang.flag}
            </span>
            <div className="lang-info">
              <span className="lang-name">{lang.name}</span>
              <span className={`lang-level${lang.native ? " native" : ""}`}>{lang.level}</span>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </motion.section>
  );
}

export default LanguagesCard;
