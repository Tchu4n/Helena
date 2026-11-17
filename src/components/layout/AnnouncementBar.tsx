// Top strip with a coupon or shipping message; hidden on purchase screens (GER-02, next plan).
export function AnnouncementBar({ text }: { text: string | null }) {
  if (!text) return null;
  return (
    <aside aria-label="Anúncio" className="bg-primary px-4 py-2 text-center font-mono text-[0.625rem] font-medium uppercase tracking-[0.08em] text-background md:text-[0.6875rem]">
      {text}
    </aside>
  );
}
