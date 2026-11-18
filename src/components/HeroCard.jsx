import { motion } from "framer-motion";
import { ExternalLink, Radio, User } from "lucide-react";
import { APP_CONFIG } from "../lib/constants.js";

export function HeroCard({ profile, variants }) {
  const login = profile?.login || APP_CONFIG.githubUsername;
  const titleText = profile?.login ? `GitHub Profile: ${profile.login}` : "GitHub Profile";
  const displayName = profile?.name || (profile ? "Sem nome" : "Carregando...");
  const usernameHref = profile?.html_url || `https://github.com/${login}`;
  const bioText = profile?.bio || (profile ? "Sem bio informada." : "Aguardando dados da API do GitHub...");

  return (
    <motion.section
      className="card hero-card"
      variants={variants}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.25 }}
    >
      <div className="hero-top">
        <div>
          <p className="kicker">
            <Radio size={13} aria-hidden="true" />
            GitHub Intelligence Panel
          </p>
          <h1 id="title">{titleText}</h1>
          <p className="hero-text">
            Monitoramento automático de métricas públicas e stack tecnológica em tempo quase real.
          </p>
        </div>
      </div>

      <div className="profile-wrap">
        <motion.div
          className="avatar-frame"
          whileHover={{ scale: 1.05 }}
          transition={{ type: "spring", stiffness: 280, damping: 20 }}
        >
          {profile?.avatar_url ? (
            <img
              id="avatar"
              src={profile.avatar_url}
              alt={`Avatar de ${login}`}
              width={82}
              height={82}
            />
          ) : (
            <div className="avatar-placeholder" aria-label="Avatar carregando">
              <User size={28} aria-hidden="true" />
            </div>
          )}
        </motion.div>

        <div className="profile-content">
          <p id="name" className="name">
            {displayName}
          </p>
          <motion.a
            id="username"
            href={usernameHref}
            target="_blank"
            rel="noreferrer"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
          >
            <span>@{login}</span>
            <ExternalLink size={12} aria-hidden="true" />
          </motion.a>
          <p id="bio" className="bio">
            {bioText}
          </p>
        </div>
      </div>
    </motion.section>
  );
}

export default HeroCard;
