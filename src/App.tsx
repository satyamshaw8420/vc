import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useSession } from "./context/SessionContext";
import { AmbientBackground } from "./components/AmbientBackground";
import { Lobby } from "./pages/Lobby";
import { Prejoin } from "./pages/Prejoin";
import { Room } from "./pages/Room";
import { Ended } from "./pages/Ended";

export default function App() {
  const { page } = useSession();
  const reduce = useReducedMotion();

  return (
    <div className="relative min-h-full">
      <AmbientBackground />
      <AnimatePresence mode="wait">
        <motion.main
          key={page}
          className="relative z-10 min-h-screen"
          initial={{ opacity: 0, y: reduce ? 0 : 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: reduce ? 0 : -10 }}
          transition={{ duration: reduce ? 0 : 0.28, ease: "easeOut" }}
        >
          {page === "lobby" && <Lobby />}
          {page === "prejoin" && <Prejoin />}
          {page === "room" && <Room />}
          {page === "ended" && <Ended />}
        </motion.main>
      </AnimatePresence>
    </div>
  );
}
