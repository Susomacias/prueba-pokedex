import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex flex-1 items-center justify-center">
      <div className="text-center">
        <p>404</p>
        <p>Página no encontrada.</p>
        <Link href="/">Volver al inicio</Link>
      </div>
    </main>
  );
}
