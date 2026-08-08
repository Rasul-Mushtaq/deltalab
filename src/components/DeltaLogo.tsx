// SVG logo component - the DeltaLab triangle mark.
// Used in the navbar and hero section.

interface DeltaLogoProps {
  className?: string;
}

export default function DeltaLogo({ className = "w-8 h-8" }: DeltaLogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path d="M16 4 L28 28 L4 28 Z" fill="#00C853" />
      <path d="M16 11 L23 25 L9 25 Z" fill="#010409" />
    </svg>
  );
}
