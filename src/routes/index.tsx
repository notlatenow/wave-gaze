import { createFileRoute } from "@tanstack/react-router";
import Waves from "@/components/Waves";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Waves" },
      { name: "description", content: "Interactive ocean thread fabric with starfish video reveal." },
      { property: "og:title", content: "Waves" },
      { property: "og:description", content: "Interactive ocean thread fabric with starfish video reveal." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="w-screen h-screen">
      <Waves />
    </div>
  );
}
