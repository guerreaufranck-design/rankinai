export function json(data: any, init?: ResponseInit) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
}

export function redirect(url: string, init?: ResponseInit) {
  return new Response(null, {
    status: 302,
    ...init,
    headers: {
      Location: url,
      ...init?.headers,
    },
  });
}
