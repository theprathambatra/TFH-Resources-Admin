import Link from "next/link";

export default function Header() {
  return (
    <header className="site-shell topbar">
      <Link href="/" className="wordmark">the français hub.</Link>
      <nav className="nav">
        <Link href="/" className="hide-mobile">Resources</Link>
        <a href={process.env.NEXT_PUBLIC_MAIN_SITE_URL || "#"}>Main site ↗</a>
      </nav>
    </header>
  );
}
