import { motion } from "framer-motion";
import {
  Atom,
  Braces,
  Code2,
  Container,
  Cpu,
  Database,
  FileCode2,
  FileText,
  Flame,
  GitBranch,
  Layers,
  Palette,
  Plug,
  Server,
  Terminal
} from "lucide-react";
import { getSkillMeta, hexToRgb } from "../lib/github.js";

function SkillIconGlyph({ skillName, color }) {
  const meta = getSkillMeta(skillName);

  switch (meta.icon) {
    case "js":
    case "ts":
    case "csharp":
    case "php":
      return (
        <span className="skill-icon-badge" style={{ color }} aria-hidden="true">
          {meta.label}
        </span>
      );
    case "html":
      return <FileCode2 size={17} style={{ color }} aria-hidden="true" />;
    case "css":
    case "bootstrap":
      return <Palette size={17} style={{ color }} aria-hidden="true" />;
    case "react":
      return <Atom size={17} style={{ color }} aria-hidden="true" />;
    case "nodejs":
      return <Terminal size={17} style={{ color }} aria-hidden="true" />;
    case "firebase":
      return <Flame size={17} style={{ color }} aria-hidden="true" />;
    case "git":
      return <GitBranch size={17} style={{ color }} aria-hidden="true" />;
    case "github":
      return (
        <svg
          width="17"
          height="17"
          viewBox="0 0 24 24"
          fill={color}
          aria-hidden="true"
        >
          <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12Z" />
        </svg>
      );
    case "api":
      return <Plug size={17} style={{ color }} aria-hidden="true" />;
    case "express":
      return <Server size={17} style={{ color }} aria-hidden="true" />;
    case "docker":
      return <Container size={17} style={{ color }} aria-hidden="true" />;
    case "sql":
      return <Database size={17} style={{ color }} aria-hidden="true" />;
    case "json":
      return <Braces size={17} style={{ color }} aria-hidden="true" />;
    case "markdown":
      return <FileText size={17} style={{ color }} aria-hidden="true" />;
    case "vue":
    case "angular":
      return <Layers size={17} style={{ color }} aria-hidden="true" />;
    default:
      return <Code2 size={17} style={{ color }} aria-hidden="true" />;
  }
}

const gridVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08
    }
  }
};

const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.38, ease: [0.22, 1, 0.36, 1] }
  }
};

export function SkillsGrid({
  skills = [],
  skillsCountNote = "Aguardando análise...",
  isLoading = false,
  hasReposData = true,
  error = null,
  variants
}) {
  const showLoading = isLoading && (!hasReposData || skills.length === 0);
  const displayedSkills = showLoading ? [] : skills;
  const noteText =
    error && displayedSkills.length === 0
      ? "Falha ao analisar"
      : showLoading
        ? "Aguardando análise..."
        : skillsCountNote;

  return (
    <motion.section className="card skills-card" variants={variants}>
      <div className="section-head">
        <div className="section-title-group">
          <Cpu size={16} className="section-icon" aria-hidden="true" />
          <h2>Top Skills</h2>
        </div>
        <p id="skillsCountNote" className="section-note">
          {noteText}
        </p>
      </div>

      {showLoading && (
        <div id="skillsLoading" className="skills-loading">
          <div className="loader-dot" />
          <p>Analisando repositórios e montando matriz de skills...</p>
        </div>
      )}

      <motion.div
        id="skillsGrid"
        className="skills-grid"
        variants={gridVariants}
        initial="hidden"
        animate="visible"
      >
        {!showLoading && displayedSkills.length === 0 ? (
          <article className="skill-card empty">
            <p className="label">Nao foi possivel calcular skills com os dados atuais.</p>
          </article>
        ) : (
          displayedSkills.map((skill, index) => {
            const rgb = hexToRgb(skill.color);
            return (
              <motion.article
                key={skill.name}
                className="skill-card"
                variants={cardVariants}
                whileHover={{ y: -3 }}
                transition={{ duration: 0.2 }}
              >
                <div className="skill-card-sheen" aria-hidden="true" />

                <div className="skill-header">
                  <span
                    className="skill-icon"
                    style={{
                      backgroundColor: `rgba(${rgb}, 0.12)`,
                      borderColor: `rgba(${rgb}, 0.3)`
                    }}
                  >
                    <SkillIconGlyph skillName={skill.name} color={skill.color} />
                  </span>
                  <h3>{skill.name}</h3>
                </div>

                <div className="skill-level">
                  <span className="skill-level-label">Proficiencia</span>
                  <div className="skill-stars" aria-label={`${skill.stars} de 5 estrelas`}>
                    {[1, 2, 3, 4, 5].map((starIndex) => {
                      const isFilled = starIndex <= skill.stars;
                      return (
                        <motion.span
                          key={starIndex}
                          className={`skill-star${isFilled ? " filled" : ""}`}
                          initial={{ scale: 0.6, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{
                            delay: 0.12 + index * 0.06 + starIndex * 0.04,
                            type: "spring",
                            stiffness: 260,
                            damping: 18
                          }}
                        >
                          ★
                        </motion.span>
                      );
                    })}
                  </div>
                </div>

                <div className="skill-bar">
                  <motion.div
                    className="skill-progress"
                    style={{
                      background: `linear-gradient(90deg, ${skill.color}, ${skill.color}aa)`
                    }}
                    initial={{ width: "0%" }}
                    animate={{ width: `${skill.percentage}%` }}
                    transition={{
                      type: "spring",
                      stiffness: 95,
                      damping: 20,
                      delay: 0.15 + index * 0.08
                    }}
                  />
                </div>

                <p className="skill-percentage" style={{ color: skill.color }}>
                  {skill.percentage}%
                </p>

                <p className="skill-description">{skill.description}</p>

                <div className="skill-details">
                  <span className="skill-metric">{skill.metric}</span>
                  <span
                    className="skill-type"
                    style={{ borderColor: `rgba(${rgb}, 0.3)` }}
                  >
                    {skill.type}
                  </span>
                </div>
              </motion.article>
            );
          })
        )}
      </motion.div>
    </motion.section>
  );
}

export default SkillsGrid;
