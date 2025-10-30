import type { LoaderFunctionArgs } from "@react-router/node";
import { redirect } from "@react-router/node";

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);

  if (url.searchParams.get("shop")) {
    throw redirect(`/app?${url.searchParams.toString()}`);
  }

  return redirect("/app");
}
