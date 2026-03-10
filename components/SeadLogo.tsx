interface SeadLogoProps {
  className?: string;
  white?: boolean;
}

export default function SeadLogo({ className = "w-16 h-16", white = false }: SeadLogoProps) {
  return (
    <img
      src="/logo.png"
      // alt="S.E.A.D. Logo"
      className={className}
    />
  );
}
