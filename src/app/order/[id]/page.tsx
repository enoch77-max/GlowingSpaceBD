import App from "@/App";

export default async function OrderConfirmationRoutePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <App initialUrl={`/order/${id}`} />;
}
