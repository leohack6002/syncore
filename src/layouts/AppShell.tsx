import { motion } from "framer-motion";
import { CommandPalette } from "@/features/command-palette/CommandPalette";
import { InboxList } from "@/features/inbox/InboxList";
import { MailReader } from "@/features/mail-reader/MailReader";
import { Sidebar } from "@/components/navigation/Sidebar";

export function AppShell() {
  return (
    <main className="relative h-screen w-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,rgb(44_218_255_/_0.12),transparent_34%),radial-gradient(circle_at_80%_0%,rgb(155_124_255_/_0.12),transparent_32%),#07090f]">
      <div className="absolute inset-0 bg-[linear-gradient(rgb(255_255_255_/_0.035)_1px,transparent_1px),linear-gradient(90deg,rgb(255_255_255_/_0.035)_1px,transparent_1px)] bg-[size:48px_48px] opacity-30" />
      <motion.section
        className="relative z-10 grid h-full grid-cols-[auto_minmax(340px,430px)_1fr]"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      >
        <Sidebar />
        <InboxList />
        <MailReader />
      </motion.section>
      <CommandPalette />
    </main>
  );
}
