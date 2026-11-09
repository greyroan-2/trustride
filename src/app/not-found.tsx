import Link from "next/link";
export default function NotFound() {
  return (
    <div className="wrap page">
      <h1>A different direction</h1>
      <p>This page could not be found.</p>
      <Link className="button" href="/">
        Back to home
      </Link>
    </div>
  );
}
