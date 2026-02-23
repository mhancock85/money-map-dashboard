import { ReactNode } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  title?: ReactNode;
}

export function GlassCard({ children, className, title }: GlassCardProps) {
  return (
    <div className={cn("glass-card p-6 flex flex-col gap-4", className)}>
      {title && <h3 className="text-slate-400 text-sm font-medium uppercase tracking-wider">{title}</h3>}
      {children}
    </div>
  );
}
