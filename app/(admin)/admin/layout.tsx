import "./admin.css";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Language, direction and the noindex now live on the (admin) root layout.
  // This wrapper only supplies the .ad styling scope.
  return <div className="ad">{children}</div>;
}
