function Bone({ className = "" }: { className?: string }) {
  return <div className={`skeleton-bone ${className}`} />;
}
function Field({ large = false }: { large?: boolean }) {
  return (
    <div className="skeleton-field">
      <Bone className="skeleton-label" />
      <Bone className={large ? "skeleton-textarea" : "skeleton-input"} />
    </div>
  );
}
function FormCard({ fields = 3 }: { fields?: number }) {
  return (
    <div className="panel skeleton-form-card">
      <Bone className="skeleton-subtitle" />
      {Array.from({ length: fields }, (_, i) => (
        <Field key={i} />
      ))}
      <Bone className="skeleton-button" />
    </div>
  );
}

export function AdminContentSkeleton({
  section = "overview",
}: {
  section?: string;
}) {
  return (
    <div
      role="status"
      aria-label={`Loading ${section === "bookings" ? "reservations" : section}`}
      aria-busy="true"
      className="admin-loading"
    >
      <span className="sr-only">Loading page content</span>
      <div aria-hidden="true">
        {section === "overview" ? (
          <>
            <div className="admin-page-heading">
              <div className="skeleton-page-heading">
                <Bone className="skeleton-label" />
                <Bone className="skeleton-title" />
                <Bone className="skeleton-description" />
              </div>
              <Bone className="skeleton-button" />
            </div>
            <div className="stats">
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} className="panel">
                  <div className="admin-stat-top">
                    <Bone className="skeleton-label" />
                    <Bone className="skeleton-icon" />
                  </div>
                  <Bone className="skeleton-number" />
                  <Bone className="skeleton-short" />
                </div>
              ))}
            </div>
            <div className="admin-quick-grid">
              {[0, 1].map((i) => (
                <div className="panel skeleton-form-card" key={i}>
                  <Bone className="skeleton-subtitle" />
                  <Bone className="skeleton-description" />
                  <Bone className="skeleton-label" />
                </div>
              ))}
            </div>
            <Bone className="skeleton-notice" />
          </>
        ) : (
          <>
            <Bone className="skeleton-title skeleton-section-title" />
            {section === "pricing" ? (
              <>
                <Bone className="skeleton-description skeleton-section-title" />
                <div className="pricing-cards">
                  {[0, 1].map((i) => (
                    <div className="panel pricing-card" key={i}>
                      <div className="pricing-card-heading">
                        <Bone className="skeleton-icon" />
                        <div className="skeleton-card-identity">
                          <Bone className="skeleton-subtitle" />
                          <Bone className="skeleton-short" />
                        </div>
                      </div>
                      <div className="pricing-fields">
                        {[0, 1, 2].map((field) => (
                          <div className="skeleton-field" key={field}>
                            <Bone className="skeleton-label" />
                            <Bone className="skeleton-input" />
                            <Bone className="skeleton-short" />
                          </div>
                        ))}
                      </div>
                      <div className="pricing-card-footer">
                        <Bone className="skeleton-label" />
                        <Bone className="skeleton-subtitle" />
                        <Bone className="skeleton-button" />
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : section === "vehicles" ? (
              <div className="list">
                <div className="panel">
                  <Bone className="skeleton-subtitle" />
                </div>
                {[0, 1].map((i) => (
                  <FormCard key={i} fields={3} />
                ))}
              </div>
            ) : section === "customers" ? (
              <div className="list">
                {[0, 1, 2, 3].map((i) => (
                  <div className="panel skeleton-customer-row" key={i}>
                    <Bone className="skeleton-icon" />
                    <div className="skeleton-card-identity">
                      <Bone className="skeleton-subtitle" />
                      <Bone className="skeleton-label" />
                    </div>
                  </div>
                ))}
              </div>
            ) : section === "bookings" ? (
              <div className="list">
                {[0, 1].map((i) => (
                  <div className="panel skeleton-form-card" key={i}>
                    <Bone className="skeleton-short" />
                    <Bone className="skeleton-subtitle" />
                    <Bone className="skeleton-description" />
                    <Bone className="skeleton-description" />
                    <Field />
                    <Bone className="skeleton-button" />
                  </div>
                ))}
              </div>
            ) : section === "testimonials" ? (
              <div className="list">
                <div className="panel skeleton-form-card">
                  <Field />
                  <Field large />
                  <Bone className="skeleton-label" />
                  <Bone className="skeleton-label" />
                  <Bone className="skeleton-button" />
                </div>
                <div className="panel skeleton-form-card">
                  <Bone className="skeleton-subtitle" />
                  <Bone className="skeleton-description" />
                  <Bone className="skeleton-button" />
                </div>
              </div>
            ) : (
              <div className="panel skeleton-form-card">
                <Bone className="skeleton-subtitle" />
                {[0, 1, 2, 3].map((i) => (
                  <Bone key={i} className="skeleton-description" />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
