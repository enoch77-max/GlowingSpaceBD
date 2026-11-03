import App from "@/App";

export default async function AdminSectionRoutePage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  return <App initialUrl={`/admin/${section}`} />;
}
