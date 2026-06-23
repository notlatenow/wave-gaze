import { createFileRoute } from "@tanstack/react-router";
import Waves from "@/components/Waves";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Wave Gaze" },
      { name: "description", content: "Swim through the waves & gaze at the sea creature cuties!" },
      { property: "og:title", content: "Wave Gaze" },
      { property: "og:description", content: "Swim through the waves & gaze at the sea creature cuties!" },
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
