import { useIsMobile } from "../hooks/useIsMobile";
import { MobileNav } from "./MobileNav";
import { DesktopSidebar } from "./DesktopSidebar";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <>
        {children}
        <MobileNav />
      </>
    );
  }

  return (
    <>
      <DesktopSidebar />
      <div style={{ marginLeft: "200px" }}>
        {children}
      </div>
    </>
  );
}
