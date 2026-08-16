import { resolveDownloadToken } from "@/lib/download";

export const dynamic = "force-dynamic";

export default async function DownloadPage({ params }) {
  const { token } = await params;
  const resolved = await resolveDownloadToken(token);

  if (!resolved) {
    return (
      <main className="download-shell">
        <div className="eyebrow">Access unavailable</div>
        <h1 className="download-title">This link can’t be used.</h1>
        <p className="download-intro">
          It may have expired or reached its download limit. Please contact The Français Hub
          with the email address used for purchase.
        </p>
        <a className="text-link" href="/">Return to resources →</a>
      </main>
    );
  }

  const { order, files } = resolved;

  return (
    <main className="download-shell">
      <div className="wordmark">the français hub.</div>
      <div style={{height: 72}} />
      <div className="eyebrow">Your purchase</div>
      <h1 className="download-title">{order.product_title}</h1>
      <p className="download-intro">
        Merci. Your files are ready below. Each click generates a short-lived private
        download from TFH storage.
      </p>

      <div className="file-list">
        {files.length ? files.map(file => (
          <div className="file-row" key={file.id}>
            <span>{file.display_name || file.file_name}</span>
            <a href={`/api/download?token=${encodeURIComponent(token)}&file=${encodeURIComponent(file.id)}`}>
              Download →
            </a>
          </div>
        )) : (
          <div className="empty">No files have been attached to this product yet.</div>
        )}
      </div>
    </main>
  );
}
