import { motion } from "framer-motion";

interface Props {
  role: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function VerifiedBadge({ role, size = "md", className = "" }: Props) {
  if (role !== "owner" && role !== "creator") return null;

  const isOwner = role === "owner";

  const dims = { sm: "w-3.5 h-3.5 text-[8px]", md: "w-4 h-4 text-[9px]", lg: "w-5 h-5 text-xs" };

  return (
    <motion.span
      initial={{ scale: 0.6, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={`inline-flex items-center justify-center rounded-full font-black shrink-0 ${dims[size]} ${className}`}
      style={{
        background: isOwner
          ? "linear-gradient(135deg, #1d6ef5 0%, #0ea5e9 100%)"
          : "linear-gradient(135deg, #e21b3c 0%, #f97316 100%)",
        boxShadow: isOwner
          ? "0 0 8px rgba(29,110,245,0.5)"
          : "0 0 8px rgba(226,27,60,0.5)",
        color: "#fff",
      }}
      title={isOwner ? "Platform Owner — full access" : "Content Creator"}
    >
      ✓
    </motion.span>
  );
}
