import { createFileRoute } from "@tanstack/react-router";
import { ClientOnly } from "@tanstack/react-router";
import Game from "@/components/Game";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Nina e o Tesouro Perdido — jogo de plataforma" },
      {
        name: "description",
        content:
          "Jogo de plataforma com 5 fases: enfrente fungos, morcegos, espinhos e lava para recuperar o tesouro perdido.",
      },
      { property: "og:title", content: "Nina e o Tesouro Perdido" },
      {
        property: "og:description",
        content: "Cinco fases de plataforma com inimigos e armadilhas. Recupere o tesouro!",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <main className="min-h-screen bg-background px-4 py-8">
      <header className="mx-auto mb-6 max-w-5xl text-center">
        <h1 className="text-4xl font-black tracking-tight text-foreground">
          Nina e o Tesouro Perdido
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          5 fases · derrote os fungos pulando na cabeça deles · morreu, volta pro início da fase
        </p>
      </header>
      <ClientOnly fallback={<div className="h-[60vh]" />}>
        <Game />
      </ClientOnly>
    </main>
  );
}
