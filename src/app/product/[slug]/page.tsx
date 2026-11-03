import App from "@/App";

export default async function ProductRoutePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <App initialUrl={`/product/${slug}`} />;
}
