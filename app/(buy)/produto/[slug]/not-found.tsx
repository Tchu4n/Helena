import { NotFoundMessage } from "@/src/components/layout";

// notFound() from this page renders inside the (buy) layout, which already has the <main>.
export default function ProductNotFound() {
  return <NotFoundMessage />;
}
