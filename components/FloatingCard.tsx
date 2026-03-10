interface FloatingCardProps {
  children: React.ReactNode;
  className?: string;
  delay?: string;
}

export default function FloatingCard({ children, className = '', delay = '0s' }: FloatingCardProps) {
  return (
    <div 
      className={`bg-white/80 backdrop-blur-md rounded-2xl shadow-xl border border-gray-100 p-6 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 ${className}`}
      style={{ animationDelay: delay }}
    >
      {children}
    </div>
  );
}
