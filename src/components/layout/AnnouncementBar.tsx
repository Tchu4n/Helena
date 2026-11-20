// Top strip with a coupon or shipping message; hidden on bag and checkout (GER-02, rule in app/globals.css).
export function AnnouncementBar({ text }: { text: string | null }) {
  if (!text) return null;
  return (
    <aside data-hide-on-purchase aria-label="Anúncio" className="bg-primary px-4 py-2 text-center font-mono text-[0.625rem] font-medium uppercase tracking-[0.08em] text-background md:text-[0.6875rem]">
      {text}
    </aside>
  );
}
