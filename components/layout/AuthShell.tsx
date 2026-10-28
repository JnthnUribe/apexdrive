import Image from "next/image";
import type { ReactNode } from "react";
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="auth-shell">
      <div className="auth-art">
        <Image
          src="/images/coastal-coupe.webp"
          alt="Auto de concepto frente al océano"
          fill
          sizes="50vw"
          className="object-cover"
        />
        <div className="auth-art-copy">
          <h2>
            Hay caminos
            <br />
            que empiezan
            <br />
            con una elección.
          </h2>
          <p>Tus favoritos, tus comparativas y tu próximo auto. Todo en un mismo lugar.</p>
          <small>Imagen editorial generada con IA.</small>
        </div>
      </div>
      <div className="auth-content">{children}</div>
    </div>
  );
}
