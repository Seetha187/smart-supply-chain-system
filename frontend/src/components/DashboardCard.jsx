function DashboardCard({ icon, status, title, value }) {
  return (
    <article className="dashboard-card">
      <div className="dashboard-card__topline">
        <span className="dashboard-card__icon" aria-hidden="true">
          {icon}
        </span>
        <span className="dashboard-card__status">{status}</span>
      </div>
      <h3>{title}</h3>
      <p>{value}</p>
    </article>
  );
}

export default DashboardCard;
