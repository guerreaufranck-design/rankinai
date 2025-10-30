export async function loader({ request }: { request: Request }) {
  const url = new URL(request.url);

  if (url.searchParams.get("shop")) {
    throw new Response(null, {
      status: 302,
      headers: {
        Location: `/app?${url.searchParams.toString()}`,
      },
    });
  }

  throw new Response(null, {
    status: 302,
    headers: {
      Location: "/app",
    },
  });
}
