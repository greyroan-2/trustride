"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <section className="request-error-page" aria-labelledby="request-error-heading">
      <div className="request-error-content">
      <span className="request-error-eyebrow">PLEASE TRY AGAIN</span>
      <h2 id="request-error-heading">We couldn’t complete that request.</h2>
      <p>
        Please try again. If the issue continues, check the service
        configuration.
      </p>
      <button type="button" className="button request-error-retry" onClick={reset}>
        Try again
      </button>
      </div>
    </section>
  );
}
