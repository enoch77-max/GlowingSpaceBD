import App from "@/App";

export default async function ShopCategoryRoutePage({
  params,
}: {
  params: Promise<{ cat: string }>;
}) {
  const { cat } = await params;
  return <App initialUrl={`/shop/${cat}`} />;
}
