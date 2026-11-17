import { AnnouncementBar } from "@/src/components/layout";
import { getHome } from "../queries/getHome.ts";

// The announcement text comes from the home content; with the API down, the bar is simply hidden.
export async function HomeAnnouncement() {
  const home = await getHome();
  return <AnnouncementBar text={home.ok ? home.data.announcement : null} />;
}
