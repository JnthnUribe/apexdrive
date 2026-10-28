/** Placeholder vectorial original (sin fotos de terceros). Se usa cuando el
 *  vehículo aún no tiene imágenes (pipeline Fase 8). */
export function VehiclePlaceholder({ title }: { title: string }) {
  return (
    <svg viewBox="0 0 800 450" role="img" aria-label={`Sin fotos: ${title}`} className="h-full w-full">
      <rect width="800" height="450" fill="#f4f4f5" />
      <ellipse cx="400" cy="330" rx="260" ry="14" fill="#000" opacity="0.08" />
      <path
        d="M130 290 C150 245 220 235 290 233 L350 230 L405 185 L520 185 L575 230 L685 240 C708 242 714 258 714 290 L714 300 L130 300 Z"
        fill="#d4d4d8"
      />
      <circle cx="280" cy="300" r="38" fill="#a1a1aa" />
      <circle cx="580" cy="300" r="38" fill="#a1a1aa" />
      <text x="400" y="380" textAnchor="middle" fontFamily="sans-serif" fontSize="20" fill="#71717a">
        Fotos próximamente
      </text>
    </svg>
  );
}
