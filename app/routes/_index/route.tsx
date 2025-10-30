import type { LoaderFunctionArgs } from "@react-router/node";
import { redirect } from "@react-router/node";

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);

  if (url.searchParams.get("shop")) {
    throw redirect(`/app?${url.searchParams.toString()}`);
  }

  return redirect("/app");
}
```

**Sauvegarde** et **commit** ce fichier.

## 📁 ÉTAPE 2 : Créer/Modifier le BON fichier pour le dashboard

Maintenant, va dans `app/routes/` et trouve le fichier **`app._index.tsx`** (pas dans un sous-dossier).

Si tu ne le vois pas dans l'arborescence, cherche-le avec Ctrl+P (ou Cmd+P) et tape : `app._index.tsx`

C'est DANS CE FICHIER `app._index.tsx` qu'on doit mettre le code du dashboard !

## 🎯 Structure correcte
```
app/
  routes/
    _index/
      route.tsx  ← Code simple de redirection (ce qu'on vient de corriger)
    app._index.tsx  ← LE DASHBOARD VA ICI !
    app.tsx
    ...
