import { motion } from "framer-motion";

export function Footer() {
  return (
    <motion.footer
      className="site-footer"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.45, delay: 0.35 }}
    >
      <div className="site-footer-inner">
        <span>GitHub Realtime Dashboard · Sincronizado via GitHub REST API</span>
      </div>
    </motion.footer>
  );
}

export default Footer;
