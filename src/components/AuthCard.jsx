import { motion } from 'framer-motion';
import { GlassCard } from './ui';
import '../pages/Auth.css';

/**
 * The single-card frame for pages a member reaches from an email: confirming an address,
 * asking for a reset link, choosing a new password. Same paper and doodles as login, no
 * sales pitch beside it, because the member is already mid-task.
 */
export default function AuthCard({ children }) {
  return (
    <div className="auth on-dark">
      <div className="auth__orb auth__orb--a" aria-hidden="true" />
      <div className="auth__orb auth__orb--b" aria-hidden="true" />
      <motion.main
        className="auth__single"
        id="main"
        initial={{ opacity: 0, y: 22 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <GlassCard className="auth__card">{children}</GlassCard>
      </motion.main>
    </div>
  );
}
