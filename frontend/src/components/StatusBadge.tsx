/**
 * StatusBadge Component
 *
 * Displays campaign status with appropriate styling.
 * Supports three states: ACTIVE, ENDED, SUCCESSFUL
 */

interface StatusBadgeProps {
  status: "ACTIVE" | "ENDED" | "SUCCESSFUL";
  size?: "sm" | "md" | "lg";
}

export default function StatusBadge({ status, size = "md" }: StatusBadgeProps) {
  const sizeClasses = {
    sm: "px-2 py-1 text-xs",
    md: "px-3 py-1.5 text-sm",
    lg: "px-4 py-2 text-base",
  };

  const statusConfig = {
    ACTIVE: {
      bg: "bg-blue-100",
      text: "text-blue-700",
      border: "border-blue-200",
      label: "Active",
      icon: "●",
    },
    ENDED: {
      bg: "bg-gray-100",
      text: "text-gray-700",
      border: "border-gray-200",
      label: "Ended",
      icon: "○",
    },
    SUCCESSFUL: {
      bg: "bg-green-100",
      text: "text-green-700",
      border: "border-green-200",
      label: "Successful",
      icon: "✓",
    },
  };

  const config = statusConfig[status];

  return (
    <span
      className={`
        inline-flex items-center gap-1.5
        ${sizeClasses[size]}
        ${config.bg}
        ${config.text}
        border ${config.border}
        rounded-full
        font-semibold
      `}
    >
      <span className="text-xs">{config.icon}</span>
      {config.label}
    </span>
  );
}