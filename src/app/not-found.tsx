import Link from "next/link";

export default function NotFound() {
  return (
    <div className="card mt-6 text-center">
      <p className="text-4xl">🔍</p>
      <h1 className="mt-2 text-xl font-bold">Puslapis nerastas</h1>
      <p className="mt-2 text-sm text-muted">
        Nuoroda neteisinga arba proga buvo ištrinta. Patikrinkite, ar nukopijavote visą nuorodą.
      </p>
      <Link href="/" className="btn mt-4 bg-ink text-void hover:bg-white">
        Į pradžią
      </Link>
    </div>
  );
}
